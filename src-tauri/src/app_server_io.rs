use std::collections::HashMap;
use std::sync::Arc;

use serde_json::Value;
use tauri::AppHandle;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{ChildStderr, ChildStdout};
use tokio::sync::{mpsc, oneshot, Mutex};
use tokio::task::JoinHandle;

use crate::error::{AppError, AppResult};
use crate::events::{emit_fatal, emit_notification, emit_server_request};
use crate::models::JsonRpcErrorBody;
use crate::rpc_transport::{parse_incoming_line, IncomingMessage};

pub enum PendingOutcome {
    Result(Value),
    Error(JsonRpcErrorBody),
}

pub type PendingMap = Arc<Mutex<HashMap<String, oneshot::Sender<PendingOutcome>>>>;

pub fn spawn_writer_task(
    app: AppHandle,
    mut rx: mpsc::UnboundedReceiver<String>,
    mut stdin: tokio::process::ChildStdin,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        while let Some(line) = rx.recv().await {
            if write_line(&mut stdin, &line).await.is_err() {
                let _ = emit_fatal(&app, "写入 app-server stdin 失败");
                break;
            }
        }
    })
}

pub fn spawn_reader_task(
    app: AppHandle,
    stdout: ChildStdout,
    pending: PendingMap,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        loop {
            match lines.next_line().await {
                Ok(Some(line)) => {
                    if let Err(error) = handle_incoming_line(&app, &pending, line).await {
                        let _ = emit_fatal(&app, error.to_string());
                    }
                }
                Ok(None) => break,
                Err(error) => {
                    let _ = emit_fatal(&app, format!("读取 stdout 失败: {error}"));
                    break;
                }
            }
        }
    })
}

pub fn spawn_stderr_task(app: AppHandle, stderr: ChildStderr) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        loop {
            match lines.next_line().await {
                Ok(Some(line)) => {
                    let _ = emit_fatal(&app, format!("app-server stderr: {line}"));
                }
                Ok(None) => break,
                Err(error) => {
                    let _ = emit_fatal(&app, format!("读取 stderr 失败: {error}"));
                    break;
                }
            }
        }
    })
}

async fn write_line(stdin: &mut tokio::process::ChildStdin, line: &str) -> AppResult<()> {
    stdin.write_all(line.as_bytes()).await?;
    stdin.write_all(b"\n").await?;
    stdin.flush().await?;
    Ok(())
}

async fn handle_incoming_line(
    app: &AppHandle,
    pending: &PendingMap,
    line: String,
) -> AppResult<()> {
    match parse_incoming_line(&line)? {
        IncomingMessage::Notification { method, params } => emit_notification(app, method, params)?,
        IncomingMessage::ServerRequest { id, method, params } => {
            emit_server_request(app, id, method, params)?;
        }
        IncomingMessage::Response { id, result, error } => {
            resolve_pending_response(pending, id, result, error).await?;
        }
    }
    Ok(())
}

async fn resolve_pending_response(
    pending: &PendingMap,
    id: String,
    result: Option<Value>,
    error: Option<JsonRpcErrorBody>,
) -> AppResult<()> {
    let sender = pending.lock().await.remove(&id);
    let Some(sender) = sender else {
        return Err(AppError::Protocol(format!("未匹配的 response id: {id}")));
    };

    match (result, error) {
        (Some(value), None) => {
            let _ = sender.send(PendingOutcome::Result(value));
        }
        (_, Some(error)) => {
            let _ = sender.send(PendingOutcome::Error(error));
        }
        _ => {
            let _ = sender.send(PendingOutcome::Error(JsonRpcErrorBody {
                code: -32603,
                message: "response 缺少 result/error".to_string(),
                data: None,
            }));
        }
    }
    Ok(())
}

# Plan: 后端网络/RPC 通信优化

## 概述

对 Tauri Rust 后端的网络/RPC 通信层进行预防性优化，聚焦三个核心改进：
1. 消除异步执行器上的同步文件 I/O 阻塞
2. 终端输出事件节流防止 IPC 桥拥塞
3. 认证配置文件的跨进程安全写入

## execution_mode

single-agent

## 改动范围

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src-tauri/src/commands.rs` | 修改 | 将 auth/provider 同步命令改为 async + spawn_blocking |
| `src-tauri/src/codex_auth/live.rs` | 无改动 | 函数本身保持同步，由调用方包装 |
| `src-tauri/src/terminal_manager.rs` | 修改 | 增加终端输出节流逻辑 |
| `src-tauri/src/codex_auth/live_io.rs` | 修改 | 增加文件锁 |
| `src-tauri/Cargo.toml` | 修改 | 添加 `fs2` 依赖 |

## 详细设计

### Task 1: 同步 Tauri 命令改为 async + spawn_blocking

**目标**: 将 `commands.rs` 中调用文件 I/O 的同步 Tauri 命令改为 async，使用 `spawn_blocking` 包装，与 `git/commands.rs` 的模式一致。

**涉及命令**（目前为同步但内部做文件 I/O）:
- `app_apply_codex_provider` (调用 `activate_codex_provider` → `write_live_files`)
- `app_get_codex_auth_mode_state` (调用 `get_codex_auth_mode_state` → `read_live_files`)
- `app_activate_codex_chatgpt` (调用 `activate_codex_chatgpt` → `write_live_files`)
- `app_capture_codex_oauth_snapshot` (调用 `capture_codex_oauth_snapshot` → `read_live_files`)
- `app_list_codex_providers` (调用 `list_codex_providers` → 文件读取)
- `app_upsert_codex_provider` (调用 `upsert_codex_provider` → 文件写入)
- `app_delete_codex_provider` (调用 `delete_codex_provider` → 文件操作)
- `app_read_proxy_settings` / `app_write_proxy_settings` (文件 I/O)
- `app_read_global_agent_instructions` / `app_write_global_agent_instructions` (文件 I/O)
- `app_import_official_data` (文件操作)
- `app_list_codex_sessions` / `app_read_codex_session` / `app_delete_codex_session` (文件操作)
- `app_remember_command_approval_rule` (文件操作)

**实现方式**:

在 `commands.rs` 中复用 `git/commands.rs` 的 `run_blocking` 模式：

```rust
async fn run_blocking<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> AppResult<T> + Send + 'static,
{
    let result = tokio::task::spawn_blocking(task)
        .await
        .map_err(|error| error.to_string())?;
    result.map_err(|error| error.to_string())
}
```

将每个同步命令改为 async 版本，例如：

```rust
// Before:
#[tauri::command]
pub fn app_apply_codex_provider(
    input: ApplyCodexProviderInput,
) -> Result<CodexProviderApplyResult, String> {
    to_result(activate_codex_provider(input))
}

// After:
#[tauri::command]
pub async fn app_apply_codex_provider(
    input: ApplyCodexProviderInput,
) -> Result<CodexProviderApplyResult, String> {
    run_blocking(move || activate_codex_provider(input)).await
}
```

**注意事项**:
- 部分命令需要 `AppHandle` 参数（如 `app_list_codex_sessions`），`AppHandle` 实现了 `Send + Sync + Clone`，可以安全 move 到 spawn_blocking 中
- 窗口操作命令（`app_set_window_theme`、`app_start_window_dragging`、`app_control_window`）应保持同步，因为它们不做文件 I/O 且需要与窗口线程交互
- `app_open_external` 保持同步（调用系统命令，非文件 I/O）
- `app_show_notification` / `app_show_context_menu` 保持同步（仅 emit 事件）

### Task 2: 终端输出事件节流

**目标**: 在 `terminal_manager.rs` 的 `spawn_output_thread` 中增加时间窗口节流，将高频终端输出合并为批次 emit。

**设计**:

```rust
const OUTPUT_THROTTLE_MS: u64 = 16; // ~60fps

fn spawn_output_thread(app: AppHandle, session_id: String, mut reader: Box<dyn Read + Send>) {
    std::thread::spawn(move || {
        let mut buffer = [0_u8; OUTPUT_BUFFER_SIZE];
        let mut decoder = Utf8ChunkDecoder::new();
        let mut pending_output = String::new();
        let mut last_emit = std::time::Instant::now();

        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(bytes_read) => {
                    if let Some(chunk) = decoder.decode(&buffer[..bytes_read]) {
                        pending_output.push_str(&chunk);
                    }

                    let elapsed = last_emit.elapsed();
                    if elapsed >= Duration::from_millis(OUTPUT_THROTTLE_MS)
                        || pending_output.len() >= OUTPUT_BUFFER_SIZE
                    {
                        if !pending_output.is_empty() {
                            let _ = emit_terminal_output(
                                &app,
                                session_id.clone(),
                                std::mem::take(&mut pending_output),
                            );
                            last_emit = std::time::Instant::now();
                        }
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => break,
            }
        }

        // flush 残留数据
        if let Some(chunk) = decoder.finish() {
            pending_output.push_str(&chunk);
        }
        if !pending_output.is_empty() {
            let _ = emit_terminal_output(&app, session_id, pending_output);
        }
    });
}
```

**关键决策**:
- 节流时间窗口 16ms（~60fps），在延迟和吞吐之间取得平衡
- 累积缓冲区达到 `OUTPUT_BUFFER_SIZE`（4KB）时也立即 flush，防止内存堆积
- 保持 `std::thread::spawn`（非 tokio::spawn），因为 `portable_pty::Read` 是同步阻塞 I/O
- 退出循环后 flush 残留数据确保不丢失

### Task 3: 认证文件跨进程锁

**目标**: 在 `codex_auth/live_io.rs` 的 `write_live_files` 中使用 `fs2` 文件锁防止 GUI 与 CLI 并发写入冲突。

**依赖**: `Cargo.toml` 添加 `fs2` crate。

**设计**:

```rust
use fs2::FileExt;

pub(crate) fn write_live_files(
    auth_path: &Path,
    auth_bytes: &[u8],
    config_path: &Path,
    config_bytes: &[u8],
) -> AppResult<()> {
    let lock_path = auth_path.with_extension("lock");
    let lock_file = fs::OpenOptions::new()
        .create(true)
        .write(true)
        .open(&lock_path)
        .map_err(|e| AppError::Io(format!("无法创建锁文件: {e}")))?;
    lock_file.lock_exclusive()
        .map_err(|e| AppError::Io(format!("无法获取文件锁: {e}")))?;

    let result = write_live_files_inner(auth_path, auth_bytes, config_path, config_bytes);

    let _ = lock_file.unlock();
    result
}

fn write_live_files_inner(
    auth_path: &Path,
    auth_bytes: &[u8],
    config_path: &Path,
    config_bytes: &[u8],
) -> AppResult<()> {
    let old_auth = read_optional_bytes(auth_path)?;
    write_bytes_atomic(auth_path, auth_bytes)?;
    if let Err(error) = write_bytes_atomic(config_path, config_bytes) {
        restore_previous_file(auth_path, old_auth.as_deref())?;
        return Err(error);
    }
    Ok(())
}
```

**注意事项**:
- 锁文件使用 `.lock` 扩展名，与 auth.json 同目录
- `lock_exclusive` 是阻塞的，但由于 Task 1 已将调用方改为 `spawn_blocking`，不会阻塞 async 执行器
- `fs2` 在 Windows 上使用 `LockFileEx`，在 Unix 上使用 `flock`，跨平台兼容
- drop 时 `fs2` 会自动释放锁，显式 unlock 是防御性编程

## 不在范围内的改动

以下优化项被判定为低优先级，不在本次实现范围：

1. **PendingMap 改用并发 HashMap**: 当前 app-server 通信频率不高，锁竞争不明显
2. **ProcessManager 无锁获取 runtime**: 架构改动较大，收益有限
3. **RPC 批量 flush**: 当前每条消息独立 flush 是正确行为

## 验收标准

1. 所有做文件 I/O 的同步 Tauri 命令已改为 async + spawn_blocking
2. 终端输出具有 16ms 节流窗口，高速输出场景不会导致 IPC 拥塞
3. 认证配置写入使用文件锁保护
4. `cargo build --manifest-path src-tauri/Cargo.toml` 编译通过
5. `cargo test --manifest-path src-tauri/Cargo.toml` 所有测试通过
6. 现有前端功能不受影响（命令接口签名不变）

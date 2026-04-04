# Exploration Report: 后端网络/RPC 通信优化

## 1. 架构概述

项目后端采用 Tauri 2 + Rust 架构，核心通信模式为：

```
React Frontend ←→ Tauri IPC Bridge ←→ Rust Host ←→ codex app-server (子进程, stdio JSON-RPC)
```

### 关键模块

| 模块 | 文件 | 职责 |
|------|------|------|
| RPC 传输 | `rpc_transport.rs` | JSON-RPC 消息构建/解析 |
| 服务器 I/O | `app_server_io.rs` | stdout/stdin 读写任务、pending 请求管理 |
| 进程管理 | `process_manager.rs` | app-server 生命周期、RPC 请求/通知/取消 |
| 事件分发 | `events.rs` | Rust→前端事件 emit |
| 终端管理 | `terminal_manager.rs` | PTY 会话、终端 I/O |
| Git 运行时 | `git/runtime.rs` | 仓库缓存、inflight snapshot 合并 |
| Git 命令 | `git/commands.rs` | Git 操作的 Tauri 命令 |
| 认证 | `codex_auth/live.rs` | 配置文件读写 |
| 认证 I/O | `codex_auth/live_io.rs` | 原子文件写入 |
| 命令层 | `commands.rs` | 所有 Tauri 命令入口 |

## 2. 发现的优化点

### 2.1 阻塞异步执行器的同步文件 I/O（高优先级）

**位置**: `codex_auth/live.rs:225-238`, `codex_auth/live_io.rs:1-54`

**问题**: `read_live_files` 和 `write_live_files` 使用 `std::fs` 同步 I/O。这些函数虽然不在 `async fn` 中直接调用，但它们被同步 Tauri 命令（`commands.rs:277-302`）调用，而这些同步命令运行在 Tauri 的线程池上。当磁盘 I/O 缓慢（如网络驱动器）时，可能阻塞 Tauri 线程池。

**当前代码**:
```rust
// live.rs:225-231
fn read_auth_map(path: &Path) -> AppResult<JsonMap<String, JsonValue>> {
    if !path.exists() { return Ok(JsonMap::new()); }
    let text = fs::read_to_string(path)?;  // 同步阻塞
    parse_auth_map(&text)
}
```

**优化方案**: 将认证相关的同步 Tauri 命令改为 `async` 并使用 `tokio::task::spawn_blocking` 包装文件 I/O（与 `git/commands.rs` 的 `run_blocking` 模式一致）。

### 2.2 终端输出无节流直接 emit（中优先级）

**位置**: `terminal_manager.rs:196-216`, `events.rs:65-76`

**问题**: `spawn_output_thread` 以 4KB 缓冲区循环读取 PTY 输出，每次读取都直接 `emit_terminal_output` 到前端。高速输出场景（如 `cat` 大文件、`npm install` 等）会产生大量高频 IPC 事件，可能导致 Tauri IPC 桥拥塞和 UI 卡顿。

**当前代码**:
```rust
// terminal_manager.rs:200-206
loop {
    match reader.read(&mut buffer) {
        Ok(bytes_read) => {
            if let Some(chunk) = decoder.decode(&buffer[..bytes_read]) {
                let _ = emit_terminal_output(&app, session_id.clone(), chunk); // 每次读取都 emit
            }
        }
        ...
    }
}
```

**优化方案**: 引入时间窗口节流（如 16ms ≈ 60fps），将短时间内多次读取的数据合并为一次 emit。

### 2.3 PendingMap 锁粒度可优化（低优先级）

**位置**: `app_server_io.rs:22`, `process_manager.rs:112-124`

**问题**: `PendingMap` 使用 `Arc<Mutex<HashMap>>` 保护所有 pending 请求。在 `handle_incoming_line`（reader task）和 `register_pending_request`/`rpc_cancel`（命令层）之间存在锁竞争。每次收到 response 都需要 lock → remove → unlock。

**当前影响**: 由于 app-server 通信频率中等（用户交互驱动），实际竞争概率不高。但如果未来 app-server 变得更"健谈"（如 streaming responses），可能成为瓶颈。

**优化方案**: 可以考虑使用 `dashmap` 或将 `PendingMap` 改为无锁并发 HashMap，但鉴于当前场景影响不大，标记为低优先级。

### 2.4 ProcessManager::get_runtime 每次请求都加锁（低优先级）

**位置**: `process_manager.rs:163-166`

**问题**: 每个 RPC 操作（`rpc_request`、`rpc_notify`、`rpc_cancel`、`resolve_server_request`）都通过 `get_runtime()` 获取 runtime，而该方法每次都 lock mutex 然后 clone Arc。

**当前代码**:
```rust
async fn get_runtime(&self) -> AppResult<Arc<AppServerRuntime>> {
    let guard = self.runtime.lock().await;
    guard.clone().ok_or(AppError::NotRunning)
}
```

**优化方案**: 使用 `tokio::sync::watch` channel 替代 `Mutex<Option<Arc>>` 模式，让消费者通过 watch receiver 无锁获取最新 runtime 引用。

### 2.5 认证配置文件无跨进程锁（中优先级）

**位置**: `codex_auth/live_io.rs:6-18`

**问题**: `write_live_files` 使用原子写入（写 .tmp 再 rename），但没有跨进程文件锁。如果用户同时运行 CLI 和 GUI，存在配置覆盖风险。

**优化方案**: 使用 `fs2` 或 `fd-lock` crate 在写入前获取文件级排他锁。

### 2.6 RPC 写入每行都 flush（低优先级）

**位置**: `app_server_io.rs:82-87`

**问题**: `write_line` 每发送一行消息都调用 `stdin.flush().await`。对于单条消息这是正确的（确保及时发送），但如果未来出现批量发送场景，可以优化为 batch flush。

**当前影响**: 由于消息频率低，每条消息都 flush 是合理的默认行为。

### 2.7 Git 操作已有良好的并发模式（亮点）

**位置**: `git/commands.rs:15-24`, `git/runtime.rs:50-104`

**亮点**:
- 所有 Git 命令使用 `spawn_blocking` 避免阻塞 async 执行器
- `GitRuntimeState::run_status_snapshot` 使用 `watch` channel 合并同 repo 的并发 status 请求
- `RepositoryContextCache` 缓存仓库上下文避免重复解析

这是项目中并发处理的最佳实践，auth 和其他模块的同步命令应参考此模式。

## 3. 优化优先级矩阵

| 优化项 | 影响面 | 风险 | 难度 | 优先级 |
|--------|--------|------|------|--------|
| 同步文件 I/O → spawn_blocking | 高（所有 auth 命令） | 低 | 低 | P0 |
| 终端输出节流 | 中（终端用户体验） | 低 | 中 | P1 |
| 认证文件跨进程锁 | 中（并发安全） | 低 | 低 | P1 |
| ProcessManager 无锁获取 runtime | 低 | 中 | 中 | P2 |
| PendingMap 改用并发 HashMap | 低 | 中 | 中 | P2 |
| RPC 批量 flush | 低 | 低 | 低 | P3 |

## 4. 经验和建议

- Git 模块的 `run_blocking` + `spawn_blocking` 模式是处理同步 I/O 的标准范式，应推广到 auth 等其他模块
- 终端输出节流是用户体验的直接改善点，但需要注意平衡延迟和吞吐
- 跨进程文件锁虽然影响面有限（CLI + GUI 并行场景），但对数据完整性重要

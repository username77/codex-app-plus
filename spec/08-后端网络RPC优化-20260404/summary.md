# Summary: 后端网络/RPC 通信优化

## 实现概述

完成了 Tauri Rust 后端网络/RPC 通信层的三项预防性优化，改善了异步执行器的线程安全、终端 IPC 性能和跨进程配置安全。

## 已完成的改动

### Task 1: 同步 Tauri 命令改为 async + spawn_blocking

**文件**: `src-tauri/src/commands.rs`

将 20+ 个做文件 I/O 的同步 Tauri 命令改为 async 版本，使用 `run_blocking` 辅助函数（复用 `git/commands.rs` 的模式）将同步操作移到 `tokio::task::spawn_blocking` 线程池。

涉及命令：
- Auth/Provider: `app_apply_codex_provider`, `app_get_codex_auth_mode_state`, `app_activate_codex_chatgpt`, `app_capture_codex_oauth_snapshot`, `app_read_chatgpt_auth_tokens`, `app_write_chatgpt_auth_tokens`, `app_clear_chatgpt_auth_state`
- Provider CRUD: `app_list_codex_providers`, `app_upsert_codex_provider`, `app_delete_codex_provider`
- Agents: `app_get_agents_settings`, `app_set_agents_core`, `app_create_agent`, `app_update_agent`, `app_delete_agent`, `app_read_agent_config`, `app_write_agent_config`
- Settings: `app_read_proxy_settings`, `app_write_proxy_settings`, `app_read_global_agent_instructions`, `app_write_global_agent_instructions`, `app_list_custom_prompts`
- Data: `app_import_official_data`, `app_list_codex_sessions`, `app_read_codex_session`, `app_delete_codex_session`
- Rules: `app_remember_command_approval_rule`

保持同步的命令（不做文件 I/O）：
- RPC 相关: `app_server_start/stop/restart`, `rpc_request/notify/cancel`, `server_request_resolve`
- 窗口操作: `app_set_window_theme`, `app_start_window_dragging`, `app_control_window`
- 系统操作: `app_open_external`, `app_open_workspace`, `app_open_codex_config_toml`
- 事件: `app_show_notification`, `app_show_context_menu`

### Task 2: 终端输出事件节流

**文件**: `src-tauri/src/terminal_manager.rs`

在 `spawn_output_thread` 中增加了 16ms 时间窗口节流：
- 在时间窗口内多次读取的数据被累积到 `pending_output` 缓冲区
- 当时间窗口到期或累积数据达到 4KB 时批量 emit
- 退出循环后 flush 所有残留数据确保不丢失
- 常量 `OUTPUT_THROTTLE_MS = 16`（~60fps）

### Task 3: 认证文件跨进程锁

**文件**: `src-tauri/src/codex_auth/live_io.rs`, `src-tauri/Cargo.toml`

- 添加 `fs2 = "0.4.3"` 依赖
- `write_live_files` 函数在写入前通过 `fs2::FileExt::lock_exclusive` 获取 `.lock` 文件的排他锁
- 写入完成后显式释放锁（`unlock`），同时 drop 时自动释放
- 将原有写入逻辑移入 `write_live_files_inner` 保持代码清晰

## 接口兼容性

所有改动对前端完全透明：
- Tauri 命令的参数和返回类型不变
- `async` 标记对 Tauri IPC 调用方无影响
- 事件名和 payload 结构不变

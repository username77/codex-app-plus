# Codex App Plus

基于 `React + Vite + Tauri` 的 Codex Windows 桌面壳工程。

## 本地开发

```bash
pnpm install
CODEX_BINARY_PATH=codex pnpm run generate:protocol
pnpm run dev:tauri
```

## 协议生成

- `scripts/generate-protocol.mjs` 现在要求显式传入 `CODEX_BINARY_PATH`。
- 该变量应指向当前官方 `codex` CLI，例如 `codex`、`codex.cmd` 或对应绝对路径。
- Windows 沙盒相关能力依赖最新官方 `codex app-server` 协议生成物，不再使用固定旧版本解包产物。

## 关键约束

- 宿主命令层不做静默降级，错误直接上抛并通过 `fatal.error` 事件广播。
- 协议通信走 JSON 行协议（stdio）。
- 数据目录默认独立到 `%LOCALAPPDATA%/CodexAppPlus`。

## 已实现接口

- Tauri commands:
  - `app_server_start`
  - `app_server_stop`
  - `app_server_restart`
  - `rpc_request`
  - `rpc_cancel`
  - `server_request_resolve`
  - `app_open_external`
  - `app_show_notification`
  - `app_show_context_menu`
  - `app_import_official_data`

- Event channels:
  - `connection.changed`
  - `notification.received`
  - `serverRequest.received`
  - `fatal.error`

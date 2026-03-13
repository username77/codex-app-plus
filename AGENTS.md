# AGENTS.md

本文件定义 Codex App Plus 的开发规范与架构设计，适用于前端（React + TypeScript）与宿主层（Tauri + Rust）协作开发。

## 1. 项目目标与边界

- 本项目是 Codex 的 Windows 桌面外壳，核心职责是承接官方 app-server/CLI 协议能力并提供桌面体验。
- 业务主线：工作区与线程、对话与 Composer、设置与配置、Git、终端、MCP、宿主集成。
- 设计原则：协议优先、状态可追踪、错误显式暴露、不做静默降级。

## 2. 总体架构

### 2.1 分层模型

- UI/Feature 层：`src/features/*`
  - 按功能域拆分，负责视图、交互、局部模型。
- 应用编排层：`src/app/*`
  - 负责启动流程、控制器编排、通知分发、线程生命周期管理。
- 状态层：`src/state/*` + `src/domain/*`
  - 统一状态、事件动作、reducer 与类型定义。
- 协议层：`src/protocol/*`
  - 负责 app-server 协议方法、类型守卫、映射器与生成产物。
- Bridge 层：`src/bridge/*`
  - 前端对 Tauri 命令/事件的类型化封装。
- 宿主层：`src-tauri/src/*`
  - 提供进程管理、RPC 转发、终端管理、Git 命令、系统能力与事件发射。

### 2.2 关键数据流

1. UI 触发 feature action。
2. `useAppController` 或 feature hook 发起协议调用 / bridge 调用。
3. bridge 通过 Tauri command 调用 Rust 命令，或订阅 Tauri event。
4. 返回结果进入 reducer 更新全局状态。
5. UI 由状态驱动刷新。

### 2.3 前后端边界约束

- 前端不得直接拼接或猜测宿主内部文件布局，统一走 bridge 接口。
- 宿主命令层必须返回明确错误，不可吞错。
- 协议字段变更必须先更新生成产物，再修改消费代码。

## 3. 目录与职责约定

- `src/features/`：仅放功能域代码，跨域复用放到 `src/features/shared/`。
- `src/app/controller/`：放应用级编排，不写重 UI 逻辑。
- `src/state/appReducer.ts`：集中处理全局 action，保持纯函数。
- `src/protocol/generated/` 与 `src/protocol/schema/`：视为生成文件，不手写业务逻辑。
- `src-tauri/src/commands.rs`：命令入口与参数校验。
- `src-tauri/src/process_manager.rs`、`terminal_manager.rs`：运行时资源生命周期核心。

## 4. 编码规范

### 4.1 TypeScript/React

- 使用严格类型，禁止无必要 `any`。
- 状态更新优先不可变写法，禁止在 reducer 内做副作用。
- 组件职责单一：
  - 页面容器负责组装。
  - 复杂业务逻辑下沉到 hooks/model。
- 异步调用必须有错误处理路径（日志 + 用户可见反馈）。
- 文案优先中文，必要时可保留英文技术词。

### 4.2 Rust/Tauri

- command 入参必须校验，错误统一转为字符串返回前端。
- 资源生命周期必须可回收：进程、任务、终端、pending request 都要有关闭路径。
- 避免 panic 作为业务错误处理手段。
- 新增事件时需同步定义事件名与前端 payload 类型。

### 4.3 通用约束

- 变更应最小化，避免无关重构。
- 生成文件只通过脚本更新，不手工改写。
- 保持 ASCII 为默认字符集；仅在既有中文上下文中使用中文文案。

## 5. 状态与资源管理规范

- 全局状态唯一事实来源是 store/reducer，禁止绕过 store 维护并行真相。
- 通知与 banner 等高频集合必须有上限控制。
- 线程切换、会话删除、主线程中断时，必须触发子代理/终端清理流程。
- 事件订阅必须成对管理（attach/detach），防止重复监听与内存泄漏。

## 6. 协议与 Bridge 规范

- 新增协议方法时：
  1. 更新协议生成产物。
  2. 补齐 `src/protocol/methods.ts`、guard、mapper。
  3. 更新 bridge 类型定义与实现。
  4. 在 controller/feature 接入并补测试。
- 任何跨层 payload 均需显式类型定义，不使用隐式 `unknown` 透传到 UI。

## 7. Git 与提交流程规范

- 提交粒度：一次提交只解决一个明确问题。
- 提交前至少执行：
  - `pnpm run typecheck`
  - `pnpm test`
- 涉及协议或许可证生成时额外执行：
  - `pnpm run generate:protocol`
  - `pnpm run generate:licenses`
- 不提交临时调试代码、无用日志与本地环境文件。

## 8. 测试策略

- 优先补充模型层、reducer、协议映射与关键 hook 的单元测试。
- 对线程生命周期、子代理清理、MCP 状态刷新等高风险路径补回归测试。
- 新增 command 或 bridge API 时至少覆盖一条成功路径与一条失败路径。

## 9. 变更清单要求（PR Checklist）

每次改动需在 PR 描述中回答：

- 改动属于哪一层（feature/controller/state/protocol/bridge/tauri）？
- 是否影响线程生命周期或资源回收？
- 是否新增/修改 command、event、协议字段？
- 增加了哪些测试，覆盖了哪些风险点？
- 是否需要更新 README、本文件或其他开发文档？

## 10. 禁止事项

- 禁止跨层直接调用（例如 UI 直接触达 Tauri 原生命令细节）。
- 禁止在 reducer、纯 model 函数中读写 IO。
- 禁止忽略错误并静默 fallback。
- 禁止手改协议生成文件后不更新生成脚本产物。

---

当架构发生明显变化（例如新增大模块、替换状态管理模式、重构协议层）时，必须同步更新本文件。
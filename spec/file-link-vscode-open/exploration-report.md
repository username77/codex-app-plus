# 探索报告：文件链接点击跳转 VS Code

## 参考项目分析（CodexMonitor）

### 架构总览

CodexMonitor 实现了完整的文件链接识别 + 点击打开链路，分为以下层次：

1. **Markdown AST 插件层** — `remarkFileLinks` remark 插件
2. **文件路径解析层** — `messageFileLinks.ts` + `fileLinks.ts`
3. **UI 渲染层** — `Markdown.tsx` 自定义 `a`/`code` components
4. **点击处理层** — `useFileLinkOpener` hook
5. **Tauri 后端层** — `open_workspace_in` 命令 + `open_workspace_in_core`

### 关键文件映射

| CodexMonitor 文件 | 职责 |
|---|---|
| `src/utils/fileLinks.ts` | 底层文件位置解析（ParsedFileLocation, path:line:column） |
| `src/features/messages/utils/messageFileLinks.ts` | remark 插件 + 文件路径识别 + 格式化 |
| `src/features/messages/utils/mountedWorkspacePaths.ts` | workspace 路径解析辅助 |
| `src/features/messages/utils/workspaceRoutePaths.ts` | 区分 workspace 路由和真实文件路径 |
| `src/features/messages/components/Markdown.tsx` | 自定义 ReactMarkdown 渲染器 |
| `src/features/messages/hooks/useFileLinkOpener.ts` | 点击处理（openFileLink + showFileLinkMenu） |
| `src/services/tauri.ts` → `openWorkspaceIn` | Tauri 前端桥接 |
| `src-tauri/src/shared/workspaces_core/io.rs` | Rust 后端：`open_workspace_in_core` |

### Rust 后端实现要点

CodexMonitor 的 `open_workspace_in_core` 支持两种行号跳转策略：
- **GotoFlag**：`--goto file:line:column`（VS Code / Cursor）
- **PathWithLineColumn**：`file:line:column`（Zed）

对于 VS Code，使用 `--goto` 参数实现精确跳转。

## 当前项目分析（codex-app-plus）

### 已有基础

1. **MarkdownRenderer** (`src/features/conversation/ui/MarkdownRenderer.tsx`)
   - 使用 ReactMarkdown + remarkGfm + remarkBreaks
   - 链接只有 `target="_blank"`，无文件路径识别
   - 非常简单，约 42 行

2. **ConversationMessageContent** (`src/features/conversation/ui/ConversationMessageContent.tsx`)
   - 将消息拆分为 markdown 和 proposed-plan 段落
   - 使用 MarkdownRenderer 渲染 markdown 段落

3. **workspace_launcher.rs** (Rust 后端)
   - 已有 `open_workspace` 命令，支持 VS Code 打开目录
   - **不支持** `--goto file:line:column`
   - 已有完善的 VS Code 二进制定位逻辑

4. **HostBridge** (前端桥接层)
   - 已有 `app.openWorkspace({ path, opener })` 接口
   - OpenWorkspaceInput 只有 `path` + `opener`，无 `line`/`column`

### 差异分析

| 维度 | CodexMonitor | codex-app-plus | 需要做的事 |
|---|---|---|---|
| Markdown 渲染 | 完整自定义 | 极简版 | 大幅增强 |
| 文件路径解析 | 完整的 fileLinks + messageFileLinks | 无 | 需要移植 |
| remark 插件 | remarkFileLinks | 无 | 需要移植 |
| 点击处理 | useFileLinkOpener | 无 | 需要创建 |
| 后端文件打开 | open_workspace_in（支持 line/column） | open_workspace（仅目录） | 需要扩展 |
| 右键菜单 | 完整（打开/Finder/复制） | 无 | 可简化实现 |
| mounted workspace 解析 | 有 | codex-app-plus 无 workspace 概念 | 不需要 |
| workspace route 区分 | 有（/workspace/settings 等） | 不需要 | 不需要 |

### 简化决策

codex-app-plus 与 CodexMonitor 的主要架构差异：
- codex-app-plus **没有** CodexMonitor 的 workspace 概念（mounted workspace, workspace route）
- codex-app-plus 使用自定义 store 而非 CodexMonitor 的架构
- 右键菜单暂时简化为只有"在 VS Code 中打开"

因此以下模块 **不需要移植**：
- `mountedWorkspacePaths.ts`
- `workspaceRoutePaths.ts`
- `OpenAppMenu` 相关的多应用切换 UI

# Plan: 文件链接点击跳转 VS Code

## 概述

在对话消息的 Markdown 渲染中，自动识别文件路径文本，将其渲染为可点击的蓝色链接。点击后通过 Tauri 后端调用 VS Code 的 `--goto` 参数，跳转到对应文件的精确位置（行:列）。

**参考实现**：`E:\code\CodexMonitor`
**execution_mode**：single-agent

## 实现步骤

### Step 1: 创建文件路径解析工具库

**新建文件**: `src/utils/fileLinks.ts`

从 CodexMonitor 的 `src/utils/fileLinks.ts` 移植核心类型和函数：

```typescript
// 核心类型
export type ParsedFileLocation = {
  path: string;
  line: number | null;
  column: number | null;
};

// 核心函数
export function parseFileLocation(rawPath: string): ParsedFileLocation;
export function formatFileLocation(path, line, column): string;
export function normalizeFileLinkPath(rawPath: string): string;
export function toFileUrl(path, line, column): string;
export function parseFileUrlLocation(url: string): ParsedFileLocation | null;
```

支持的文件位置格式：
- `file.ts:42` — 文件名:行号
- `file.ts:42:10` — 文件名:行号:列号
- `file.ts#L42` — 文件名#L行号
- `file.ts#L42C10` — 文件名#L行号C列号
- `file.ts:10-20` — 文件名:起始行-结束行（取起始行）

**直接移植**，无需修改。

### Step 2: 创建消息文件链接工具库

**新建文件**: `src/features/conversation/utils/messageFileLinks.ts`

从 CodexMonitor 的 `src/features/messages/utils/messageFileLinks.ts` 移植，**简化**以下内容：

**保留**：
- `remarkFileLinks()` — remark 插件，将文本中的文件路径转换为 `codex-file:` 协议链接
- `parseInlineFileTarget(value)` — 解析内联代码中的文件目标
- `formatParsedFileLocation(target)` — 格式化解析后的文件位置
- `parseFileLinkUrl(url)` / `toFileLink(target)` — `codex-file:` 协议编解码
- `isFileLinkUrl(url)` — 判断是否为文件链接 URL
- `resolveMessageFileHref(url, workspacePath)` — 解析 href 中的文件引用
- `describeFileTarget(target, workspacePath)` — 描述文件目标（文件名、行号标签、父路径）
- `relativeDisplayPath(path, workspacePath)` — 相对路径显示
- 文件路径正则匹配逻辑（POSIX、Windows 绝对路径、Windows UNC 路径）

**移除**：
- 对 `mountedWorkspacePaths` 的依赖（codex-app-plus 无此概念）
- 对 `workspaceRoutePaths` 的依赖
- `isLikelyMountedWorkspaceFilePath` 相关逻辑
- `usesAbsolutePathDepthFallback` 中的 workspace route 判断

具体修改：
- `isLikelyFileHref` 函数中移除 `isLikelyMountedWorkspaceFilePath` 调用，保留其他文件路径判断逻辑
- `usesAbsolutePathDepthFallback` 简化为只检查 `hasLikelyLocalAbsolutePrefix` + 路径深度

### Step 3: 增强 MarkdownRenderer

**修改文件**: `src/features/conversation/ui/MarkdownRenderer.tsx`

主要改动：

1. 添加 props：
   ```typescript
   interface MarkdownRendererProps {
     readonly className?: string;
     readonly markdown: string;
     readonly variant?: MarkdownVariant;
     readonly workspacePath?: string | null;
     readonly onOpenFileLink?: (path: ParsedFileLocation) => void;
     readonly onOpenFileLinkMenu?: (event: React.MouseEvent, path: ParsedFileLocation) => void;
   }
   ```

2. 添加 `remarkFileLinks` 到 remarkPlugins

3. 自定义 `a` component：
   - 检测 `codex-file:` 协议链接 → 渲染 `FileReferenceLink` 组件
   - 检测 href 中的文件路径 → 渲染可点击文件链接
   - 外部链接（http/https）→ 使用 `openExternal` 打开
   - 其他链接 → 阻止默认行为

4. 自定义 `code` component（内联代码）：
   - 解析内联代码文本，如果是文件路径 → 渲染 `FileReferenceLink`
   - 否则 → 正常渲染 `<code>`

5. 添加 `urlTransform` 回调：
   - 保留文件链接 URL 不被 sanitize

6. 新增 `FileReferenceLink` 组件（内联定义在 MarkdownRenderer 中）：
   ```tsx
   function FileReferenceLink({ href, rawPath, showFilePath, workspacePath, onClick, onContextMenu }) {
     // 展示文件名 + 行号标签
   }
   ```

### Step 4: 扩展 Rust 后端支持文件打开

**修改文件**: `src-tauri/src/workspace_launcher.rs`

在现有 `open_workspace` 函数基础上，新增 `open_file_in_editor` 函数：

```rust
pub fn open_file_in_editor(input: OpenFileInEditorInput) -> AppResult<()> {
    // 1. 解析 VS Code 二进制路径（复用现有 resolve_vscode_binary）
    // 2. 构建 --goto file:line:column 参数
    // 3. 通过 --reuse-window 尝试在已打开的窗口中打开
    // 4. spawn 命令
}
```

**新增类型** (在 `src-tauri/src/models.rs` 或对应位置):
```rust
#[derive(Deserialize)]
pub struct OpenFileInEditorInput {
    pub path: String,
    pub line: Option<u32>,
    pub column: Option<u32>,
}
```

VS Code 命令格式：`code --reuse-window --goto path:line:column`

**新增 Tauri command** (在 `commands.rs`):
```rust
#[tauri::command]
pub fn app_open_file_in_editor(input: OpenFileInEditorInput) -> Result<(), String> {
    to_result(open_file_in_editor(input))
}
```

**注册命令** (在 `main.rs` 的 `invoke_handler` 中添加)

### Step 5: 扩展前端 Bridge 层

**修改文件**: `src/bridge/appTypes.ts`

新增接口：
```typescript
export interface OpenFileInEditorInput {
  readonly path: string;
  readonly line?: number | null;
  readonly column?: number | null;
}
```

**修改文件**: `src/bridge/hostBridgeTypes.ts`

在 `app` 对象中添加：
```typescript
openFileInEditor(input: OpenFileInEditorInput): Promise<void>;
```

**修改文件**: `src/bridge/tauriHostBridge.ts`

实现桥接：
```typescript
openFileInEditor: (input: OpenFileInEditorInput) =>
  invokeWithInput("app_open_file_in_editor", input),
```

### Step 6: 创建 useFileLinkOpener hook

**新建文件**: `src/features/conversation/hooks/useFileLinkOpener.ts`

简化版的 CodexMonitor `useFileLinkOpener`：

```typescript
export function useFileLinkOpener(
  hostBridge: HostBridge,
  workspacePath: string | null,
) {
  const openFileLink = useCallback(async (target: ParsedFileLocation) => {
    // 1. 解析相对路径为绝对路径（基于 workspacePath）
    // 2. 调用 hostBridge.app.openFileInEditor({ path, line, column })
    // 3. 错误处理（console.warn + 可选 toast）
  }, [hostBridge, workspacePath]);

  return { openFileLink };
}
```

暂不实现右键菜单（`showFileLinkMenu`），后续迭代。

### Step 7: 连接 ConversationMessageContent

**修改文件**: `src/features/conversation/ui/ConversationMessageContent.tsx`

1. 获取 `hostBridge` 和 `workspacePath`
2. 使用 `useFileLinkOpener` 获取 `openFileLink`
3. 传递 `workspacePath` 和 `onOpenFileLink` 给 `MarkdownRenderer`

需要确认如何在 ConversationMessageContent 中获取这些依赖：
- `hostBridge` — 通过 context 或 props
- `workspacePath` — 通过 store 的 workspace 状态

### Step 8: 添加文件链接样式

**修改文件**: 在对应的 CSS 文件中添加样式

```css
.message-file-link {
  color: var(--accent-color, #4dabf7);
  text-decoration: none;
  cursor: pointer;
  border-bottom: 1px solid transparent;
}
.message-file-link:hover {
  border-bottom-color: var(--accent-color, #4dabf7);
}
.message-file-link-name {
  /* 文件名部分 */
}
.message-file-link-line {
  opacity: 0.7;
  margin-left: 2px;
  font-size: 0.85em;
}
.message-file-link-path {
  opacity: 0.5;
  margin-left: 4px;
  font-size: 0.85em;
}
```

## 文件变更清单

### 新建文件
1. `src/utils/fileLinks.ts` — 文件路径解析工具库
2. `src/features/conversation/utils/messageFileLinks.ts` — 消息文件链接工具 + remark 插件
3. `src/features/conversation/hooks/useFileLinkOpener.ts` — 点击处理 hook

### 修改文件
4. `src/features/conversation/ui/MarkdownRenderer.tsx` — 增强 Markdown 渲染
5. `src/features/conversation/ui/ConversationMessageContent.tsx` — 连接 hook
6. `src-tauri/src/workspace_launcher.rs` — 新增 `open_file_in_editor`
7. `src-tauri/src/models.rs` — 新增 `OpenFileInEditorInput` 类型
8. `src-tauri/src/commands.rs` — 新增 Tauri command
9. `src-tauri/src/main.rs` — 注册命令
10. `src/bridge/appTypes.ts` — 新增前端接口
11. `src/bridge/hostBridgeTypes.ts` — 扩展 HostBridge
12. `src/bridge/tauriHostBridge.ts` — 实现桥接
13. CSS 文件 — 添加文件链接样式

## 风险与注意事项

1. **路径解析边界情况**：需要正确区分文件路径和普通斜线文本（如 "Git/Plan experience"）
2. **Windows 路径兼容**：需要支持反斜杠路径和驱动器号前缀
3. **相对路径解析**：需要基于 workspace 路径解析相对路径为绝对路径
4. **VS Code 实例复用**：使用 `--reuse-window` 确保在已打开的窗口中打开，而非新建窗口

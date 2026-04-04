# Test Plan: 文件链接点击跳转 VS Code

## 测试范围

本测试计划覆盖文件链接功能的前端部分（Rust 后端由 `cargo test` 覆盖）。

## 测试文件

### 1. `src/utils/fileLinks.test.ts` — 文件路径解析

**测试 `parseFileLocation`**：
- 解析 `src/app.tsx:42` → path=`src/app.tsx`, line=42, column=null
- 解析 `src/app.tsx:42:10` → path=`src/app.tsx`, line=42, column=10
- 解析 `src/app.tsx#L42` → path=`src/app.tsx`, line=42, column=null
- 解析 `src/app.tsx#L42C10` → path=`src/app.tsx`, line=42, column=10
- 解析 `src/app.tsx:10-20` → path=`src/app.tsx`, line=10
- 纯路径 `src/app.tsx` → path=`src/app.tsx`, line=null, column=null
- Windows 路径 `C:\repo\app.tsx:42` → path=`C:\repo\app.tsx`, line=42
- 无效行号 `file:0` → line=null
- 空字符串 → path="", line=null

**测试 `formatFileLocation`**：
- `(path, 42, null)` → `"path:42"`
- `(path, 42, 10)` → `"path:42:10"`
- `(path, null, null)` → `"path"`

**测试 `toFileUrl`**：
- POSIX 路径 → `file:///path/to/file`
- Windows 路径 → `file:///C:/path/to/file`
- 带行号 → `file:///path#L42`

**测试 `parseFileUrlLocation`**：
- `file:///path/to/file#L42` → 正确解析
- `http://example.com` → null
- 非法 URL → null

### 2. `src/features/conversation/utils/messageFileLinks.test.ts` — 消息文件链接

**测试 `remarkFileLinks` 插件**：
- 不将自然语言斜线短语转为文件链接（如 "Keep the Git/Plan experience"）
- 将明确的文件路径转为链接（如 `docs/setup.md`）
- 将绝对路径转为链接（如 `/Users/example/project/src/index.ts`）
- 不转换内联代码中的路径
- 不转换已有链接中的路径
- 不转换 file:// URL（避免双重处理）
- 不转换 vscode:// 开头的 URI

**测试 `parseInlineFileTarget`**：
- `src/app.tsx` → 正确解析
- `src/app.tsx:42` → path + line
- 纯文件名无路径 `app.tsx` → null（需要路径分隔符）
- 空字符串 → null

**测试 `isFileLinkUrl`**：
- `codex-file:xxx` → true
- `http://xxx` → false

**测试 `toFileLink` / `parseFileLinkUrl` 往返一致性**：
- 编码后解码应得到相同结果

**测试 `describeFileTarget`**：
- 绝对路径 + workspacePath → 正确的相对显示路径
- 带行号 → lineLabel 正确
- 无 workspacePath → 显示完整路径

**测试 `resolveMessageFileHref`**：
- `file:///C:/repo/app.tsx` → 正确解析
- 相对路径 `src/app.tsx:42` → 正确解析
- `http://example.com` → null

### 3. `src/features/conversation/ui/MarkdownRenderer.test.tsx` — Markdown 渲染

**测试增强后的 MarkdownRenderer**：
- 渲染包含文件路径的 markdown，文件路径应被包裹在 `.message-file-link` 链接中
- 内联代码中的文件路径应被渲染为文件链接
- 外部链接（http/https）不受影响
- `onOpenFileLink` 回调在点击文件链接时被调用
- 普通 markdown 内容渲染不受影响
- `variant="title"` 模式下也正常工作

### 4. `src-tauri/src/workspace_launcher/tests.rs` — Rust 后端

**已有测试文件扩展**：
- `open_file_in_editor` 构建正确的 `--goto path:line:column` 参数
- 路径为空时返回错误
- line 为 None 时只传路径不传 `--goto`
- Windows 路径的反斜杠处理

## 测试执行

```bash
# 前端测试
pnpm test -- src/utils/fileLinks.test.ts
pnpm test -- src/features/conversation/utils/messageFileLinks.test.ts
pnpm test -- src/features/conversation/ui/MarkdownRenderer.test.tsx

# Rust 测试
cargo test --manifest-path src-tauri/Cargo.toml -- workspace_launcher
```

## 验收标准

1. 所有新增测试通过
2. 现有测试不受影响（`pnpm test` 全部通过）
3. `pnpm run typecheck` 无错误
4. Rust `cargo test` 通过

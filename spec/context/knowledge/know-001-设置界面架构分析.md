---
id: KNOW-001
title: codex-app-plus 设置界面架构分析
type: 代码分析
keywords: [settings, SettingsView, AppPreferences, 组件结构, 未实现功能, worktree]
created: 2026-03-29
---

# codex-app-plus 设置界面架构分析

## 概述

设置界面采用侧边栏单层导航 + 内容区路由的布局模式，共 11 个 section。
主入口为 `SettingsScreen.tsx`（懒加载容器），核心视图为 `SettingsView.tsx`。
所有前端偏好通过 `AppPreferences` 类型统一管理，持久化到 localStorage。

## 详细内容

### 核心文件

- `SettingsScreen.tsx` — 懒加载容器，从 AppController/HostBridge 组装 props
- `SettingsView.tsx` — 主视图：侧边栏导航 + 内容区 if-chain 路由
- `SettingsStaticSections.tsx` — 静态内容：EnvironmentContent / WorktreeContent / PlaceholderContent
- `useAppPreferences.ts` — AppPreferences 类型定义和 Hook（localStorage 持久化）

### 导航结构（11 项平铺，无分组）

| key | 实现状态 | 备注 |
|-----|----------|------|
| general | 已实现 | 运行环境/终端/语言/会话/发送键 |
| appearance | 已实现 | 主题/颜色/字体/代码风格 |
| config | 已实现 | 认证/Provider/代理/Sandbox + ComposerPermissionDefaultsCard |
| agents | 已实现 | Multi-Agent/线程数/深度/Agent列表 |
| personalization | 已实现 | Personality/全局AGENTS.md |
| mcp | 已实现 | 来自 features/mcp/ui/McpSettingsPanel |
| git | 已实现 | 分支前缀/强制推送 |
| environment | 已实现 | 工作区根目录列表 |
| worktree | **未实现** | 纯静态占位，Toggle 和数值均硬编码 |
| archived | 已实现 | 存档会话列表/取消存档 |
| about | 已实现 | 应用更新卡片 |


### 未实现功能

1. **Worktree 页**（`SettingsStaticSections.tsx → WorktreeContent`）
   - 组件无 props，无任何 handler
   - autoClean Toggle 硬编码 `checked={true}`，无 onClick
   - retention chip 硬编码值 "15"
   - 无对应 Rust 命令或 bridge 接口

2. **DisplaySettingsCard**（`ui/DisplaySettingsCard.tsx`）
   - 孤立文件，无任何组件引用
   - 实现了字体 family+size 设置，与 AppearanceSettingsSection 内联实现重复
   - 推测为外观设置重构遗留的废弃组件

### AppPreferences 类型（useAppPreferences.ts）

```typescript
interface AppPreferences {
  agentEnvironment: "windowsNative" | "wsl";
  workspaceOpener: WorkspaceOpener;
  embeddedTerminalShell: EmbeddedTerminalShell;
  embeddedTerminalUtf8: boolean;
  themeMode: "light" | "dark" | "system";
  uiLanguage: UiLanguage;
  threadDetailLevel: "compact" | "commands" | "full";
  followUpQueueMode: FollowUpMode;
  composerEnterBehavior: ComposerEnterBehavior;
  composerPermissionLevel: ComposerPermissionLevel;
  composerDefaultApprovalPolicy: ComposerApprovalPolicy;
  composerDefaultSandboxMode: SandboxMode;
  composerFullApprovalPolicy: ComposerApprovalPolicy;
  composerFullSandboxMode: SandboxMode;
  uiFontFamily: string;
  uiFontSize: number;
  codeFontFamily: string;
  codeFontSize: number;
  gitBranchPrefix: string;
  gitPushForceWithLease: boolean;
  contrast: number;
  appearanceColors: AppearanceColorScheme;
  codeStyle: CodeStyleId;
}
```

### 组件依赖关系

```
SettingsScreen → SettingsView
  SettingsSidebar（内部）
  SettingsContent（内部）
    GeneralSettingsSection → SettingsSelectRow
    AppearanceSettingsSection → AppearanceColorControl, CodeStyleSelect, CodeStylePreview
    ConfigSettingsSection → CodexAuthModeCard, CodexProviderListCard, ProxySettingsCard, WindowsSandboxSettingsCard
    ComposerPermissionDefaultsCard（紧跟 Config 渲染）→ SettingsSelectRow
    AgentsSettingsSection
    PersonalizationSettingsSection → SettingsSelectRow
    McpSettingsPanel（跨域：features/mcp/ui/）→ McpServerDialog
    GitSettingsSection
    EnvironmentContent（SettingsStaticSections）
    WorktreeContent（SettingsStaticSections，静态无逻辑）
    ArchivedThreadsSettingsSection
    AboutSettingsSection → AppUpdateCard
    PlaceholderContent（兜底）
```

## 相关文件

- `src/features/settings/ui/SettingsView.tsx`
- `src/features/settings/ui/SettingsScreen.tsx`
- `src/features/settings/ui/SettingsStaticSections.tsx`
- `src/features/settings/hooks/useAppPreferences.ts`
- `src/features/settings/config/experimentalFeatures.ts`
- `src/features/mcp/ui/McpSettingsPanel.tsx`

## 参考

- 探索报告：`spec/settings-layout-refactor/exploration-report.md`


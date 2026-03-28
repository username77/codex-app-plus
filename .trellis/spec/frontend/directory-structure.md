# Directory Structure

> How frontend code is organized in this project.

---

## Overview

当前前端采用“**App 壳层 + Feature 分域 + Domain/State/Bridge 支撑层**”结构。

核心原则：
- 业务按 feature 聚合，不按技术层大杂烩
- 组件负责渲染，复杂逻辑下沉到 hooks/model
- 跨层协议与宿主交互放在 bridge/protocol/controller

---

## Directory Layout

```text
src/
├── app/                 # 应用壳层：启动、页面切换、顶层控制器与装配
│   ├── controller/
│   └── ui/
├── features/            # 按业务域拆分（auth/composer/home/settings/workspace...）
│   └── <feature>/
│       ├── ui/          # 视图组件
│       ├── hooks/       # 状态编排与交互逻辑
│       ├── model/       # 纯函数与数据转换
│       └── service/     # 特定 feature 的服务封装（按需）
├── domain/              # 领域模型和共享业务类型
├── state/               # 全局状态容器（自建 store/reducer）
├── bridge/              # 前端与宿主环境交互类型/桥接
├── protocol/            # 协议客户端与生成类型
├── styles/              # 全局样式与主题变量
└── test/                # 测试工具与测试辅助
```

---

## Module Organization

### 1) App 层只做“装配与编排”

典型示例：
- `src/app/App.tsx`
- `src/app/ui/AppScreenContent.tsx`
- `src/app/controller/useAppController.ts`

约定：
- `App.tsx` 主要做依赖拼装、screen 切换、顶层 provider 组织
- 避免把 feature 细节逻辑直接堆在 `App.tsx`

### 2) Feature 内部按 ui/hooks/model 分工

典型示例：
- `src/features/auth/ui/AuthChoiceView.tsx`
- `src/features/composer/hooks/useComposerSelection.ts`
- `src/features/composer/model/composerAttachments.ts`

约定：
- `ui/`: 渲染与交互事件分发
- `hooks/`: 状态编排、副作用、控制器风格 API
- `model/`: 纯数据转换、解析、归一化

### 3) 跨 feature 的公共语义放到 domain/state/bridge/protocol

典型示例：
- `src/domain/types.ts`
- `src/state/store.tsx`
- `src/bridge/types.ts`

---

## Naming Conventions

- 组件文件：`PascalCase.tsx`（如 `AuthChoiceView.tsx`）
- Hook 文件：`useXxx.ts` / `useXxx.tsx`（如 `useWorkspaceRoots.ts`）
- 测试文件：`*.test.ts` / `*.test.tsx`
- model 文件：语义化 camelCase（如 `composerAttachments.ts`）

---

## Examples

可作为“目录分层参考样本”的文件：
- `src/app/App.tsx`
- `src/features/home/ui/HomeScreen.tsx`
- `src/features/composer/hooks/useComposerAttachments.ts`
- `src/features/composer/model/composerAttachments.ts`
- `src/state/store.tsx`

---

## Anti-patterns (Forbidden)

- 把 feature 业务逻辑直接塞进 `src/app/App.tsx`
- 新增功能时只往单一 `src/components/` 扔文件而不做 feature 聚合
- 在 UI 组件里写大量数据归一化逻辑（应下沉到 `model/`）

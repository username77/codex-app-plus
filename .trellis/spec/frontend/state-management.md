# State Management

> How state is managed in this project.

---

## Overview

本项目状态管理采用“**自建全局 store + hook 本地状态 + localStorage 持久化**”组合：
- 全局共享状态：`src/state/store.tsx`
- 局部状态：`useState/useMemo/useCallback`
- 持久化偏好：`window.localStorage`

---

## State Categories

### 1) Global State

用于跨页面/跨 feature 共享且需要集中更新的状态。

示例：
- `src/state/store.tsx`
- `src/state/appReducer.ts`
- `src/app/controller/useAppController.ts`

### 2) Local UI State

用于单组件或局部交互状态。

示例：
- `src/app/App.tsx`（`screen`、`settingsMenuOpen`）
- `src/features/composer/hooks/useComposerSelection.ts`

### 3) Persisted State (localStorage)

用于用户偏好与会话外保留信息。

示例：
- `src/features/settings/hooks/useAppPreferences.ts`
- `src/features/workspace/hooks/useWorkspaceRoots.ts`

### 4) Derived State

通过 `useMemo` 或 selector 计算，避免重复存储。

示例：
- `src/features/composer/hooks/useComposerSelection.ts`
- `src/state/store.tsx`（`useAppSelector`）

---

## When to Use Global State

满足以下任一条件时考虑提升为全局状态：
1. 两个及以上页面/feature需要共享
2. 需要统一 action/reducer 驱动更新
3. 需要可预测、可追踪的订阅机制

否则优先局部 hook 状态。

---

## Server State

当前未发现 React Query/SWR 等统一 server-state 库约定。

仓库现实模式：
- 通过 controller 层调用 bridge/protocol
- 将结果映射为领域数据后存入全局/局部状态

示例：
- `src/app/controller/useAppController.ts`
- `src/app/controller/serverRequests.ts`
- `src/domain/serverRequests.ts`

---

## Common Mistakes

1. **在 Provider 外调用 store hooks**
   - 后果：运行时抛错
   - 示例：`src/state/store.tsx` 中 `useAppStoreApi` 防御逻辑

2. **本该局部状态却提升到全局**
   - 后果：状态扩散、维护成本上升
   - 修正：先尝试 feature 内 hook 管理

3. **重复存储可推导状态**
   - 后果：双写不一致
   - 修正：改为 selector/useMemo 派生

---

## Forbidden Patterns

- 绕过 reducer 直接改写全局状态对象
- 在多个位置各自维护同一业务源状态
- 缺少边界校验就把外部输入直接写入持久化存储

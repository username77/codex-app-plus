# Hook Guidelines

> How hooks are used in this project.

---

## Overview

Hook 是前端逻辑编排的核心层，遵循：
- 命名统一 `useXxx`
- 返回“状态 + 动作”对象，而非匿名 tuple
- 副作用可追踪（`useEffect` / `useCallback` / `useMemo` 边界清晰）

---

## Custom Hook Patterns

### Pattern A: Controller-style Hook

用于跨模块编排、副作用和协议交互。

示例：
- `src/app/controller/useAppController.ts`
- `src/features/settings/hooks/useAppPreferences.ts`

特点：
- 返回具名字段对象（state + actions）
- 通过 `useCallback` 稳定动作引用

### Pattern B: Local state orchestration Hook

用于组件复用逻辑和局部状态管理。

示例：
- `src/features/composer/hooks/useComposerSelection.ts`
- `src/features/workspace/hooks/useWorkspaceRoots.ts`

---

## Data Fetching

当前仓库未采用 React Query/SWR 统一层；数据获取与同步主要通过：
1. `controller` 内调用 `hostBridge/protocol`
2. 结果写入全局 store 或 hook 本地状态
3. 由 UI 层消费

示例：
- `src/app/controller/useAppController.ts`
- `src/app/controller/serverRequests.ts`
- `src/state/store.tsx`

---

## Naming Conventions

### Required

- 文件名与导出名一致：`useXxx.ts`
- Hook 对外返回结构使用明确接口命名（如 `XxxController` / `XxxState`）
- 依赖项完整，避免闭包陈旧值

示例：
- `src/features/composer/hooks/useComposerSelection.ts`
- `src/features/workspace/hooks/useWorkspaceRoots.ts`
- `src/features/settings/hooks/useAppPreferences.ts`

---

## Common Mistakes

1. **在 Hook 中混入过多纯数据转换逻辑**
   - 修正：下沉到 model 层
   - 示例：`src/features/composer/model/composerAttachments.ts`

2. **useEffect / useCallback 依赖不完整**
   - 修正：严格补全依赖，必要时重构状态结构

3. **返回值结构不稳定**
   - 修正：使用 `useMemo` 包裹返回 controller 对象
   - 示例：`src/features/settings/hooks/useAppPreferences.ts`

---

## Forbidden Patterns

- 非 `use` 前缀命名的自定义 Hook
- 在 Hook 内直接修改外部可变对象作为状态源
- 为了“省事”使用 `as any` 绕过类型约束

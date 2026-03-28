# Type Safety

> Type safety patterns in this project.

---

## Overview

项目使用 TypeScript 严格类型，并在构建链路中执行 `tsc --noEmit`。

核心原则：
- 优先复用 domain/bridge/protocol 的既有类型
- 对外 API 类型显式、字段只读优先
- 通过 normalize/clamp/parse 做边界收敛

示例入口：
- `package.json`（`build` / `typecheck`）
- `src/domain/types.ts`
- `src/protocol/generated/*`

---

## Type Organization

### 1) 共享领域类型

放在 `src/domain/`、`src/bridge/`、`src/protocol/generated/`。

示例：
- `src/domain/types.ts`
- `src/bridge/types.ts`
- `src/protocol/generated/v2/*`

### 2) Feature 局部接口

放在具体 feature 的 hook/ui/model 文件内，服务于本地边界。

示例：
- `src/features/auth/ui/AuthChoiceView.tsx`
- `src/features/workspace/hooks/useWorkspaceRoots.ts`
- `src/features/settings/hooks/useAppPreferences.ts`

---

## Validation

未发现统一使用单一 runtime validation 库的约定（尽管依赖存在 `zod`）。
当前主流模式是按领域语义进行显式 normalize/clamp/parse：

示例：
- `src/features/workspace/hooks/useWorkspaceRoots.ts`（`normalizeStoredRoot` / `parseStoredRoots`）
- `src/features/settings/model/fontPreferences.ts`（`clamp*` / `normalize*`）
- `src/features/settings/hooks/useAppPreferences.ts`（setter + normalize）

---

## Common Patterns

1. `readonly` 字段约束不可变接口
2. 集合参数/返回值优先 `ReadonlyArray<T>`
3. Controller 返回值显式接口命名（`XxxController`）
4. 通过类型导入（`import type`）减少运行时负担

示例：
- `src/features/composer/hooks/useComposerSelection.ts`
- `src/features/workspace/hooks/useWorkspaceRoots.ts`
- `src/state/store.tsx`

---

## Forbidden Patterns

- `any`（除非历史兼容场景且有明确注释）
- 连续断言链 `as unknown as ...` 掩盖类型问题
- 对外暴露可变数组/对象而不做只读约束
- 新增类型时绕过既有 domain/protocol 类型体系另起炉灶

---

## Common Mistakes

1. **重复定义已存在的协议类型**
   - 修正：优先从 `protocol/generated` 或 `domain` 复用

2. **把输入归一化留给调用方**
   - 修正：在边界函数内集中 normalize/parse

3. **为图快引入宽松断言**
   - 修正：补全中间类型与显式收窄逻辑

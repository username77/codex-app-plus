# Component Guidelines

> How components are built in this project.

---

## Overview

组件遵循“**视图优先、逻辑外置**”原则：
- 组件负责展示和交互事件透传
- 复杂状态和副作用交由 hook/controller
- props 类型显式且尽量 `readonly`

---

## Component Structure

推荐结构（与现有实现一致）：

```tsx
interface XxxProps {
  readonly ...
}

export function Xxx(props: XxxProps): JSX.Element {
  // 轻量 UI 逻辑
  return (...);
}
```

真实示例：
- `src/features/auth/ui/AuthChoiceView.tsx`
- `src/app/ui/AppScreenContent.tsx`
- `src/app/App.tsx`

---

## Props Conventions

### Required

1. 使用 `interface XxxProps` 定义 props
2. 字段默认使用 `readonly`
3. 回调类型显式声明（如 `() => void`、`() => Promise<void>`）
4. 组件返回类型显式标注 `JSX.Element`

示例：
- `src/features/auth/ui/AuthChoiceView.tsx`
- `src/app/App.tsx`
- `src/features/home/ui/HomeScreen.tsx`

### Forbidden

- `props: any`
- 不命名/不约束的回调参数
- 未定义接口直接在函数参数内写超长内联类型（降低可读性）

---

## Styling Patterns

当前项目以**全局 CSS + className 语义命名**为主：
- 样式入口：`src/styles/index.css`
- 通过 CSS 变量管理主题与字体
- 组件 className 倾向场景前缀（如 `auth-choice-*`）

示例：
- `src/styles/index.css`
- `src/features/auth/ui/AuthChoiceView.tsx`
- `src/app/ui/AppScreenContent.tsx`

说明：仓库未形成 CSS Modules / styled-components / Tailwind 的统一约定。

---

## Accessibility

### Required

1. 优先使用语义标签（`main`、`section`、`button` 等）
2. 交互元素使用可访问属性（`type="button"`、`disabled`、`aria-label`）
3. 组件测试优先按 role/name 查询

示例：
- `src/features/auth/ui/AuthChoiceView.tsx`
- `src/features/auth/ui/AuthChoiceView.test.tsx`

---

## Common Mistakes

1. **组件承载过多业务逻辑**
   - 现象：组件里直接做数据解析/协议拼装
   - 修正：下沉到 `hooks/` 或 `model/`

2. **忽略语义化查询导致测试脆弱**
   - 现象：测试依赖 className 或内部结构
   - 修正：使用 `getByRole` / `getByText`
   - 示例：`src/features/auth/ui/AuthChoiceView.test.tsx`

3. **props 失去类型约束**
   - 现象：使用 `any` 或过度断言
   - 修正：补全 `Props` 接口并收窄类型

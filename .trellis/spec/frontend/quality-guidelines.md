# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

本项目前端质量门槛以“**类型检查 + 自动化测试 + 可读可维护**”为主。

已确认的脚本门槛：
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`（包含 `tsc --noEmit`）

参考：`package.json`

---

## Forbidden Patterns

1. `any` / 粗暴类型断言掩盖问题
2. 在 UI 组件中实现复杂数据转换（应移到 model/hook）
3. 在 Provider 外使用依赖 context 的 hooks
4. 测试依赖脆弱选择器（className/DOM 结构）而非语义查询
5. 忽略异常路径（至少要有可观测错误处理）

示例参考：
- `src/state/store.tsx`
- `src/features/auth/ui/AuthChoiceView.test.tsx`
- `src/features/composer/model/composerAttachments.ts`

---

## Required Patterns

1. 组件/Hook 对外接口必须显式类型
2. 测试优先覆盖用户可见行为（role/name/text）
3. 异步测试使用 `waitFor` 等待稳定态
4. 复用现有 feature 模式（ui/hooks/model）
5. 关键路径错误需可观测（日志或 UI 反馈）

示例：
- `src/features/auth/ui/AuthChoiceView.test.tsx`
- `src/features/composer/hooks/useComposerPicker.test.tsx`
- `src/features/home/ui/HomeScreen.tsx`

---

## Testing Requirements

### Framework

- Vitest + Testing Library + jsdom
- 参考：`package.json`

### Component Tests

最少应覆盖：
1. 基础渲染
2. 关键交互触发
3. 禁用态/加载态
4. i18n 文案分支（如适用）

示例：
- `src/features/auth/ui/AuthChoiceView.test.tsx`

### Hook/Controller Tests

最少应覆盖：
1. 初始状态
2. 关键 action 流程
3. 异步路径与异常路径
4. 外部依赖 mock 边界

示例：
- `src/app/controller/useAppController.test.tsx`
- `src/features/composer/hooks/useComposerPicker.test.tsx`

---

## Code Review Checklist

提交前/评审时确认：

- [ ] 目录是否符合现有分层（app/features/domain/state/...）
- [ ] 新组件是否只负责展示与事件分发
- [ ] 复杂逻辑是否下沉到 hook/model
- [ ] 类型是否显式且避免 `any`
- [ ] 测试是否覆盖主流程 + 至少一个边界条件
- [ ] 异常处理是否可观测（日志或提示）
- [ ] 是否复用了已有模式而非新建平行体系

---

## Known Gaps (Current Reality)

以下在仓库中暂未发现统一硬性规范：
- 统一 lint 脚本入口（`package.json` 未定义 `lint`）
- 统一覆盖率阈值策略
- 专门的 a11y 测试门禁

结论：如需新增上述门槛，应先在团队层面达成一致，再更新本规范。

# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

本目录记录 **codex-app-plus** 前端代码的真实约定（Reality over Ideal）。

目标：
1. 让 AI/新同学快速对齐现有实现风格
2. 减少“看起来更优雅但不符合仓库现实”的改动
3. 让代码审查和自动检查有明确依据

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | 模块组织与目录分层 | **Filled** |
| [Component Guidelines](./component-guidelines.md) | 组件模式、props、样式与可访问性 | **Filled** |
| [Hook Guidelines](./hook-guidelines.md) | 自定义 Hook 命名与逻辑编排模式 | **Filled** |
| [State Management](./state-management.md) | 本地状态、全局状态、持久化状态 | **Filled** |
| [Quality Guidelines](./quality-guidelines.md) | 测试、质量门槛、禁用模式 | **Filled** |
| [Type Safety](./type-safety.md) | 类型组织、约束与禁止做法 | **Filled** |

---

## How to Use

1. 开发前先读与任务相关的具体文档（不要只看 index）
2. 变更若引入新模式，先确认是否已有类似实现
3. 修复“踩坑”后，及时把经验补充到对应文档的 `Common Mistakes`

---

**Language**: 文档使用**简体中文**，技术术语保留英文。

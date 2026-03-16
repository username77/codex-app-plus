# 更新日志 / Changelog

## Recent Updates

### Features

- Git 工作流：新增二段式提交流程，点击提交后可弹出提交卡片，在卡片中填写说明并正式提交。  
	Git workflow: Added a two-step commit flow that opens a commit dialog before the final commit is submitted.

- Git 交互：统一提交入口状态判断，区分“可打开提交卡片”和“可正式提交”，并补充提交错误反馈与快捷提交体验。  
	Git interaction: Unified commit-entry availability rules by separating “can open commit dialog” from “can submit commit”, with clearer error feedback and shortcut submission support.

- 架构整理：拆分应用控制器、Bridge 类型与共享 reducer 逻辑，降低跨层耦合并提升维护性。  
	Architecture cleanup: Split app controller modules, bridge types, and shared reducer logic to reduce cross-layer coupling and improve maintainability.

- 用户输入提示卡：为自由输入题新增行内“下一题 / 提交答案”操作，优化多题问答流。  
	User input prompt: Added inline “Next” and “Submit answers” actions for free-text questions to improve multi-step prompting.

### Bug Fixes

- Git 提交体验：修复提交入口因缺少说明而容易被误判为失效的问题，让提交流程更直观可理解。  
	Git commit experience: Fixed the confusing commit entry flow that could appear broken when no message had been entered, making the workflow clearer and more discoverable.

- 提示卡交互：优化自由输入题的切题与末题提交行为，避免多题场景下操作路径不清晰。  
	Prompt interaction: Improved free-text question navigation and final-question submission behavior to make multi-question flows clearer.


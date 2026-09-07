# DBX 自定义布局开发与上游合并规范 — AI Agent 指南

> **分支**: `custom` (fork 自官方上游 [t8y2/dbx](https://github.com/t8y2/dbx))  
> **目标**: 定制 SQLyog 风格的多连接标签页工作区，同时保持与官方 upstream 版本的平滑兼容与无损升级。  
> **核心原则**: **最小改动（Minimal Diff）** —— 非必要不改后端代码，前端非必要不改通用组件，能复用就复用。

---

## 1. 核心设计与维护原则（强约束）

后续所有协助本项目开发、重构或合并代码的 **AI Agent 必须严格遵守以下原则**：

1. **零后端改动原则 (Zero Backend Modification)**：
   - 严禁（非必要绝不）修改 Rust 后端代码（`src-tauri/`、`crates/`）。
   - 保持所有数据库驱动、通信协议、加密解密及系统底层能力与官方 100% 同步。
2. **最大化组件复用原则 (Maximum Component Reuse)**：
   - 严禁修改通用业务组件的内部逻辑与布局（如 `components/grid/DataGrid.vue`、`components/editor/QueryEditor.vue`、`components/objects/ObjectBrowser.vue`、图表等）。
   - 如需改变交互，优先通过 Props / Events 传参或在外层外壳中拦截处理。
3. **独立外壳包装与条件分支隔离 (Wrapper & Branch Isolation)**：
   - 自定义布局统一存放在 `components/layout/` 并以 `Custom` 前缀命名（例如 `CustomSqlyogShell.vue`、`CustomConnectionTabBar.vue`）。
   - 在 `App.vue` 中仅通过计算属性（如 `isSqlyogLayout`）进行条件分支加载，确保官方原生布局与自定义布局彻底隔离。
4. **状态扩展优先使用独立 Composable**：
   - 不随意修改官方核心 Store（`queryStore.ts`、`connectionStore.ts`）的已有状态；
   - 连接标签及专属状态统一通过独立组合式函数（`useCustomConnectionTabs.ts`）维护。

---

## 2. `custom` 分支功能定制清单与必保规则 (Custom Feature Checklist)

每次从上游 `upstream/main` 进行 `rebase` 合并时，**必须确保以下 7 项自定义功能完整保留**：

### 🌟 1. SQLyog 风格多连接工作区模型
- **功能描述**：
  - 顶部第一层为“连接标签栏”（`CustomConnectionTabBar.vue`），每个打开的数据库连接作为一个独立 Tab 显示。
  - 左侧对象树（`AppSidebar.vue` + `ConnectionTree.vue`）自动联动过滤，仅展示当前激活连接下的数据库与表对象。
  - 首次打开连接时，自动展开该连接下的数据库节点。
  - 第二层为查询标签栏，每个连接**独立记忆并隔离**其专属的查询标签页；切换连接标签时，无缝恢复该连接上一次激活的查询页。
- **涉及核心文件**：
  - `apps/desktop/src/components/layout/CustomSqlyogShell.vue`
  - `apps/desktop/src/components/layout/CustomConnectionTabBar.vue`
  - `apps/desktop/src/composables/useCustomConnectionTabs.ts`
  - `apps/desktop/src/stores/settingsStore.ts` (`appLayout: "sqlyog"`)
  - `apps/desktop/src/App.vue` (`isSqlyogLayout`)

### 🌟 2. 设置与驱动管理采用弹窗模式 (Dialog Mode)
- **功能描述**：
  - 官方默认将“设置页面”与“驱动商店”作为全屏标签页嵌入主工作区（占用查询标签栏）。
  - 定制版将其重构为独立的**模态弹窗（Dialog）**，点击顶部工具栏“设置”或“驱动管理”时直接以弹窗形式打开，不挤占与干扰查询标签栏。
- **涉及核心文件**：
  - `apps/desktop/src/components/editor/EditorSettingsDialog.vue`
  - `apps/desktop/src/App.vue` (`showSettingsDialog`, `showDriverStoreDialog`)

### 🌟 3. 新建查询上下文智能跟随
- **功能描述**：
  - 点击“新建查询”时，自动智能继承当前**正处于激活状态的标签页**（或选中的对象节点）所在的连接与数据库信息，避免新建到其他无关连接。
  - 在标签栏最右侧提供紧随最后一个标签的 `+` 快捷新建查询按钮。
- **涉及核心文件**：
  - `apps/desktop/src/lib/sql/newQueryContext.ts`
  - `apps/desktop/src/components/layout/CustomSqlyogShell.vue`
  - `apps/desktop/src/App.vue` (`newQuery`)

### 🌟 4. 对象树双击表名智能光标插入
- **功能描述**：
  - 当当前已有激活的 SQL 查询编辑器时，在左侧对象树中双击表名，**自动将表名插入到当前 SQL 编辑器的光标位置**。
  - 在非查询页面或无激活编辑器时，保持官方默认行为（直接打开表数据网格）。
- **涉及核心文件**：
  - `apps/desktop/src/components/layout/AppSidebar.vue`
  - `apps/desktop/src/components/sidebar/ConnectionTree.vue`
  - `apps/desktop/src/lib/editor/queryEditorTextEdits.ts`

### 🌟 5. 连接关闭未保存拦截保护 (Dirty State Protection)
- **功能描述**：
  - 关闭单个连接标签页时，自动扫描属于该连接的所有查询页以及未提交的表数据编辑。
  - 若存在未保存内容，弹出二次确认弹窗（提示保存全部、放弃或取消），防止误操作关闭连接导致数据丢失。
- **涉及核心文件**：
  - `apps/desktop/src/composables/useCustomConnectionTabs.ts`
  - `apps/desktop/src/composables/useDataGridEditor.ts` (`hasDataGridPendingChangesForTab`)
  - `apps/desktop/src/components/layout/CustomSqlyogShell.vue`

### 🌟 6. macOS Apple Silicon 免签名 CI 打包工作流
- **功能描述**：
  - 新增专用的 GitHub Actions 独立工作流，支持在网页端通过 `workflow_dispatch` 手动点击或推送 `macos-*` Tag 触发。
  - 在 GitHub `macos-latest` (ARM64) 虚拟机上自动编译生成适配 Apple Silicon (M1/M2/M3/M4) 芯片的免签名 `.dmg` 安装包并上传为 Artifacts（保留 30 天）。
- **涉及核心文件**：
  - `.github/workflows/macos-build.yml`

### 🌟 7. UI 细节与多语言汉化修正
- **功能描述**：
  - 修复标签页旁边 `+` 号下拉菜单中“新建连接”英文文案（New Connection）为中文。
- **涉及核心文件**：
  - `apps/desktop/src/i18n/locales/zh-CN.ts`
  - `apps/desktop/src/i18n/locales/en.ts`

---

## 3. 上游合并（Rebase）冲突判定与 AI 决策规范

当 AI Agent 在协助用户执行 `git rebase main` 遇到冲突时，应按照以下三级规范进行处理：

### 级别 1：常规 API / 事件签名升级冲突 —— 【AI 自动适配】
- **典型场景**：官方 upstream 在新版本中重构了 `ContentArea`、`EditorToolbar` 或 `useDataGridActions` 的事件签名（例如在 v0.6.6 中将所有事件首位增加了 `tabId: string` 参数）。
- **处理规范**：AI 应主动查看官方 `apps/desktop/src/components/layout/querySurfaces.ts` 及 `App.vue` 的最新调用方式，更新 `CustomSqlyogShell.vue` 中的 Props/Emits 透传绑定与 TypeScript 类型，保持类型检查（`pnpm typecheck`）0 报错。

### 级别 2：页面入口与挂载点重构冲突 —— 【优先保留 SQLyog 外壳隔离】
- **典型场景**：官方 upstream 重构了 `App.vue` 的模板结构或组件拆分方式（例如引入了 `SqlEditorWorkspace` 或拆分子组件）。
- **处理规范**：在 `App.vue` 中保留 `v-if="isSqlyogLayout"` 条件分支，让其渲染 `<CustomSqlyogShell>`，并在 `v-else` 分支保留官方最新的默认布局。严禁直接抹掉自定义外壳分支！

### 级别 3：官方内部组件替换与职责迁移 —— 【全链路依赖审计与补齐】
- **典型场景**：官方上游废弃、掏空或重构了某个底层通用组件（例如在 v0.6.6 中将 `AppTabBar` 掏空仅用于特殊页面，把实际的查询标签渲染迁移到了 `EditorGroupTabBar`）。
- **处理规范**：
  1. **检查组件活跃度**：核对自定义外壳（如 `CustomSqlyogShell.vue`）所引用的官方组件是否仍为上游实际使用的活跃组件，若被替换须同步迁移至新组件；
  2. **挂载点与弹窗补全**：排查原组件内挂载的所有模态弹窗（如 `queryStore.showCloseConfirm` 未保存确认弹窗、Popover 列表等），确保其在自定义外壳中拥有完整的 DOM 挂载容器与事件响应；
  3. **Ref 与快捷键桥接**：核对顶层 `App.vue` 通过 `ref` 调用的快捷键方法（如 `appTabBarRef.value?.closeOtherActiveTabs()`、`contentAreaRef`），确保自定义外壳通过 `defineExpose` 或属性注入完整暴露该方法。

### 级别 4：业务逻辑设计与交互理念冲突 —— 【必须使用 `ask_question` 询问用户】
- **典型场景**：官方新增了某种全新的工作区机制（例如多窗口独立拆分、工作区多实例），与当前 SQLyog 单窗口连接标签逻辑产生设计冲突，且存在多种合理的实现方案。
- **处理规范**：
  1. AI 严禁擅自决定删除已有自定义功能或强行覆盖官方新特性；
  2. **必须调用 `ask_question` 工具向用户说明冲突原因**；
  3. 提供 2~3 个结构化方案选项（例如：A. 推荐方案：在 SQLyog 模式下兼容适配新特性；B. 方案二：在 SQLyog 模式下禁用该冲突特性，保持纯净；C. 方案三：用户自定义调整），由用户决策后再执行。

---

## 4. 核心定制文件全景速查表 (Custom File Mapping)

| 文件绝对/相对路径 | 类型 | 职责说明 | Rebase 注意事项 |
| :--- | :--- | :--- | :--- |
| `apps/desktop/src/App.vue` | 修改 | 顶层挂载点，通过 `isSqlyogLayout` 分支渲染自定义外壳 | 仅保留计算属性与外壳挂载，勿改官方业务逻辑 |
| `apps/desktop/src/components/layout/CustomSqlyogShell.vue` | 新增 | SQLyog 风格应用主外壳（顶层工具栏、连接标签栏、对象树与内容区编排） | 核心保留文件，需随官方 ContentArea 签名同步更新 |
| `apps/desktop/src/components/layout/CustomConnectionTabBar.vue` | 新增 | 第一层连接标签栏 UI 组件 | 核心保留文件 |
| `apps/desktop/src/composables/useCustomConnectionTabs.ts` | 新增 | 连接标签生命周期、激活状态记忆与关闭检查逻辑 | 核心保留文件 |
| `apps/desktop/src/lib/editor/queryEditorTextEdits.ts` | 新增 | 光标处智能插入文本工具函数 | 核心保留文件 |
| `apps/desktop/src/lib/sql/newQueryContext.ts` | 修改 | 新建查询目标连接与数据库上下文解析 | 确保优先继承激活标签上下文 |
| `apps/desktop/src/components/layout/AppSidebar.vue` | 修改 | 侧边栏事件中转与双击表名插入光标 | 确保保留 `@double-click-table` 监听 |
| `apps/desktop/src/components/sidebar/ConnectionTree.vue` | 修改 | 连接树组件双击事件与连接过滤 | 确保保留 `@double-click-table` 向上 emit |
| `apps/desktop/src/components/editor/EditorSettingsDialog.vue` | 修改 | 设置弹窗化封装 | 确保保留弹窗化展示 |
| `apps/desktop/src/stores/settingsStore.ts` | 修改 | 增加 `appLayout: "sqlyog"` 枚举值 | 仅改动布局配置字段 |
| `apps/desktop/src/styles/globals.css` | 修改 | 追加 SQLyog 模式专属样式 | 样式一律在文件末尾追加，不篡改官方已有类 |
| `.github/workflows/macos-build.yml` | 新增 | macOS Apple Silicon 免签名 Actions 工作流 | 保持独立，不影响官方 release.yml |

---

## 5. 上游合并与验证标准流程 (Upstream Sync Workflow)

```powershell
# 1. 确保工作区干净
git status

# 2. 拉取官方最新提交并同步本地 main
git fetch upstream
git checkout main
git rebase upstream/main
git push origin main

# 3. 将 custom 变基到最新的 main
git checkout custom
git rebase main

# 4. 若有冲突，对照第 3 节规范逐个解决：
#    git add <已解决文件>
#    git -c core.editor=true rebase --continue

# 5. 自定义改造点与上游组件依赖专项核对 (Critical)：
#    a. 核对第 4 节《核心定制文件全景速查表》涉及的文件是否有上游最新变动
#    b. 重点检查自定义外壳（CustomSqlyogShell.vue）所依赖的官方子组件是否被上游重构、拆分或掏空
#    c. 确认未保存拦截弹窗、右键菜单、快捷键方法桥接等宿主逻辑未因上游组件拆分而遗失

# 6. 必须运行的完整性检查：
pnpm typecheck   # 必须 0 TS/Vue 错误
pnpm test        # 必须全部通过

# 7. 推送到远程分支：
git push origin custom --force-with-lease
```

---

## 6. 每次修改自检清单（AI Agent Check-off）

- [ ] **是否遵守零后端修改原则？**（`src-tauri/` 和 `crates/` 完全未动）
- [ ] **是否复用了官方通用组件？**（没有篡改 `DataGrid`、`QueryEditor` 等内部实现）
- [ ] **是否采用了 Wrapper 外壳隔离？**（修改全部集中在 `Custom*.vue` 或 `App.vue` 条件分支）
- [ ] **是否检查了官方组件更替与职责迁移？**（核对自定义外壳所引用的官方组件是否在上游被废弃、拆分或掏空，确保未保存确认弹窗、右键菜单、快捷键等挂载点完整）
- [ ] **7 项核心自定义功能是否全部正常保留并逐一核对？**（双击表名插入光标、未保存关闭拦截、多连接标签切换、设置弹窗等）
- [ ] **`pnpm typecheck` 是否 0 报错通过？**
- [ ] **`pnpm test` 是否全部单元测试通过？**

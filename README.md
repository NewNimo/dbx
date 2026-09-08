# DBX (Custom Layout Fork)

> 🔗 **官方上游仓库**：[https://github.com/t8y2/dbx](https://github.com/t8y2/dbx)  
> 🌿 **当前分支**：`custom` (个人定制版)

本项目是 [DBX](https://github.com/t8y2/dbx) 的个人定制 Fork 仓库。主要基于官方架构实现 **SQLyog 风格的多连接标签页工作区** 及相关交互体验增强。

---

## 🎯 核心开发与维护原则（避免上游合并冲突）

为了保证项目后续能够长期、低成本、平滑地通过 `git rebase` 同步官方 `main` 分支的新功能与发布版本，本项目严格遵循以下**最小改动（Minimal Diff）**开发约束：

1. **非必要绝不修改后端代码**：保持 Rust 后端（`src-tauri/`、`crates/`）与官方 100% 一致，不触碰数据库底层协议与 API 通信层。
2. **非必要绝不修改通用前端组件**：通用业务组件（如 SQL 编辑器 `QueryEditor`、数据网格 `DataGrid`、对象浏览器 `ObjectBrowser`、图表等）全部直接复用，不修改其内部实现与逻辑。
3. **独立外壳包装与条件分支隔离**：所有自定义布局容器统一放入 `components/layout/` 并以 `Custom*` 前缀命名（如 `CustomSqlyogShell.vue`、`CustomConnectionTabBar.vue`），在 `App.vue` 中仅通过条件分支加载，保持顶层改动最小。
4. **能复用就复用**：状态管理优先复用已有的 Pinia Stores 和 Composables，状态扩展通过独立 Composable（如 `useCustomConnectionTabs.ts`）实现。

---

## 🌟 `custom` 分支功能定制清单（对比官方 `main` 分支）

| 序号 | 功能模块 | 定制特性说明 | 涉及文件 |
| :--- | :--- | :--- | :--- |
| **1** | **SQLyog 多连接标签页模型** | • 顶部新增第一层“连接标签栏”，支持多个已打开的数据库连接以独立标签展示与快速切换<br>• 左侧对象树自动跟随激活的连接标签过滤展示当前连接的内容<br>• 首次打开连接时自动展开数据库节点<br>• 第二层查询标签栏与连接相互绑定，切换连接时自动记住并恢复该连接上一次激活的查询页 | `CustomSqlyogShell.vue`<br>`CustomConnectionTabBar.vue`<br>`useCustomConnectionTabs.ts`<br>`App.vue`<br>`settingsStore.ts` |
| **2** | **设置与驱动管理弹窗化** | • 官方默认将“设置页面”与“驱动商店”作为全屏标签页嵌入主工作区<br>• 定制版将其重构为独立的**模态弹窗（Dialog）**，点击顶部工具栏设置/驱动管理时直接弹出，不挤占与混淆查询标签页 | `EditorSettingsDialog.vue`<br>`App.vue`<br>`AppToolbar.vue` |
| **3** | **新建查询上下文智能跟随** | • 点击“新建查询”时，智能继承当前**正处于激活状态的标签页**所在的连接与数据库信息，避免新建到其他连接<br>• 在标签栏最右侧添加跟随最后一个标签的快捷 `+` 新建按钮 | `newQueryContext.ts`<br>`CustomSqlyogShell.vue`<br>`App.vue` |
| **4** | **对象树双击智能光标插入** | • 当当前有激活的 SQL 查询编辑器时，双击左侧对象树中的表名，**自动将表名插入到 SQL 编辑器光标所在位置**<br>• 当处于非查询页面或无激活编辑器时，保持官方默认行为（直接打开表数据网格） | `AppSidebar.vue`<br>`queryEditorTextEdits.ts`<br>`ConnectionTree.vue` |
| **5** | **连接关闭未保存拦截保护** | • 关闭单个连接标签页时，自动扫描属于该连接的所有查询页及未提交的表数据编辑<br>• 若存在未保存内容，弹出确认弹窗提示保存或放弃，防止误关丢失修改 | `useCustomConnectionTabs.ts`<br>`useDataGridEditor.ts`<br>`CustomSqlyogShell.vue` |
| **6** | **SQL INSERT 导出字段筛选与后端防崩** | • 在 SQL INSERT 导出模式弹窗中新增字段选择器，默认全选，支持按需勾选导出部分字段<br>• 在数据表与查询结果集导出中全链路支持字段投影过滤<br>• 后端为导出执行器新增独立 8MB 线程栈包装函数，彻底解决 Windows 平台 Debug 构建下巨型 Future 栈溢出崩溃（`STATUS_STACK_OVERFLOW`）<br>• 保持原始业务逻辑不动，调用入口统一附带 `[CUSTOM_*] REVERT` 注释，易于后续上游升级一键还原 | `SqlInsertModeDialog.vue`<br>`useDataGridExport.ts`<br>`export_runtime.rs`<br>`query_result_export.rs`<br>`commands/*_export.rs` |

---

## 📁 核心定制文件对照表（Upstream 合并参考）

每次从官方 upstream rebase 代码后，如遇冲突，只需重点关注以下几个定制层文件：

```
apps/desktop/src/
├── components/
│   ├── export/SqlInsertModeDialog.vue # [微调] 新增 SQL 导出字段多选器
│   ├── layout/
│   │   ├── CustomSqlyogShell.vue      # [新增] SQLyog 风格应用主外壳（隔离官方布局）
│   │   ├── CustomConnectionTabBar.vue # [新增] 顶层连接标签栏组件
│   │   ├── AppSidebar.vue             # [微调] 增加双击表名插入光标事件转发
│   │   └── AppTabBar.vue              # [微调] 保持兼容与特殊页面工作区
│   └── objects/ObjectBrowser.vue      # [微调] 表数据 SQL 导出传递字段元数据
├── composables/
│   ├── useCustomConnectionTabs.ts     # [新增] 连接标签状态与生命周期管理
│   └── useDataGridExport.ts           # [微调] 导出透传选中字段与类型
├── lib/
│   ├── editor/queryEditorTextEdits.ts # [新增] SQL 编辑器光标处文本插入工具
│   ├── export/sqlInsertMode.ts        # [微调] 导出模式弹窗增加 columns 选项返回
│   └── sql/newQueryContext.ts         # [微调] 新建查询目标连接与数据库上下文解析
├── stores/
│   ├── queryStore.ts                  # [微调] 流式查询结果集导出透传 columns
│   └── settingsStore.ts               # [微调] 增加 appLayout: "sqlyog" 布局枚举配置
├── App.vue                            # [微调] 引入 CustomSqlyogShell 分支渲染与弹窗绑定
└── styles/globals.css                 # [微调] 追加 SQLyog 模式专属样式类
crates/dbx-core/src/
├── export_runtime.rs                  # [新增] spawn_export_task_with_enlarged_stack (8MB 栈防崩)
└── query_result_export.rs             # [微调] QueryResultExportRequest 增加 columns 投影过滤
src-tauri/src/commands/
├── query_result_export.rs             # [入口] 替换为 8MB 栈导出包装
├── table_export.rs                    # [入口] 替换为 8MB 栈导出包装
└── database_export.rs                 # [入口] 替换为 8MB 栈导出包装
```

---

## 🔄 上游同步与变基工作流（Upstream Rebase Guide）

```powershell
# 1. 保存当前未提交的代码
git add .
git commit -m "chore: save local state before upstream sync"

# 2. 拉取官方最新代码并同步本地 main
git fetch upstream
git checkout main
git rebase upstream/main
git push origin main

# 3. 将 custom 分支变基到最新的 main
git checkout custom
git rebase main

# 4. 若出现冲突，解决冲突后继续：
#    git add <冲突文件>
#    git rebase --continue

# 5. 验证代码与质量
pnpm typecheck
pnpm test

# 6. 推送更新到个人远程仓库
git push origin custom --force-with-lease
```

---

## 🛠️ 本地开发与构建命令

```powershell
# 安装依赖
pnpm install

# 🌐 纯前端快速调试模式（支持 HMR 热更新，无 Rust 编译）
pnpm dev

# ⚡ 极速桌面启动模式（跳过 OpenSSL/SQLCipher 编译，秒级启动）
pnpm tauri dev -- --no-default-features --features duckdb-sidecar,dynamodb,sqlite-bundled

# 📦 全量桌面调试模式
pnpm dev:tauri

# 🔍 类型检查与单元测试
pnpm typecheck
pnpm test

# 🏗️ 本地构建生产包
pnpm tauri build
```

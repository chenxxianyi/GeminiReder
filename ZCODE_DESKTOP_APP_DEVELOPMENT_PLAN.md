# ZCode 风格桌面阅读器开发方案

## 1. 项目目标

将当前 `GeminiReder` 项目从 Web 阅读器扩展为一个桌面端应用，提供接近代码工作台的低调阅读体验。

核心目标：

- 保留现有 EPUB 阅读能力，包括导入、渲染、目录、书签、字体设置、阅读进度。
- 以当前已有的 ZCode 风格外壳作为桌面端主界面。
- 使用桌面壳实现独立窗口、应用图标、无边框标题栏、系统级窗口控制和安装包。
- 阅读内容默认包裹在代码工作台视觉里，减少真实书籍信息暴露。
- 保留 Boss Mode，用快捷键快速切换到伪装任务内容。

边界说明：

- 不建议使用官方 ZCode 的真实商标、签名、图标或包名进行公开分发。
- 可以做 “ZCode-like / Code Workbench 风格” 的私用阅读器。
- 伪装目标是降低界面显眼程度，不做系统欺骗、签名冒充或绕过安全检测。

## 2. 当前项目判断

当前技术栈：

- 前端框架：Vue 3
- 构建工具：Vite
- 状态管理：Pinia
- 样式：Tailwind CSS + 自定义 CSS
- 阅读核心：epubjs
- 本地持久化：localStorage + localforage

当前已有基础：

- `src/components/zcode/ZCodeShell.vue`：ZCode 风格主外壳。
- `src/components/zcode/ZCodeTitleBar.vue`：顶部标题栏。
- `src/components/zcode/ZCodeSidebar.vue`：左侧项目/任务栏。
- `src/components/zcode/ZCodeReaderSurface.vue`：阅读/伪装内容区域。
- `src/components/zcode/ZCodeCommandBox.vue`：底部命令输入框。
- `src/components/reader/EpubReader.vue`：EPUB 渲染容器。
- `src/composables/useEpubReader.js`：可复用 EPUB 阅读逻辑。
- `src/stores/bookStore.js`：书籍、文章、书签、进度、字体配置存储。

当前主要问题：

- `App.vue` 中仍保留一套旧的阅读器逻辑，和 `useEpubReader.js` 存在重复。
- ZCode 外壳已经存在，但桌面应用能力尚未接入。
- Web 阶段的窗口按钮只是视觉按钮，不能真正控制系统窗口。
- 部分中文文案在终端中显示乱码，需要统一检查文件编码为 UTF-8。
- ZCode 阅读伪装的产品规则还需要固化，例如默认标题、快捷键、任务列表、Boss Mode 内容。

## 3. 技术选型

### 推荐：Tauri 2

优点：

- 和当前 Vite + Vue 项目适配成本低。
- 包体比 Electron 小。
- 可以做无边框窗口、自定义标题栏、系统托盘、快捷键、文件打开等桌面能力。
- Rust 后端只需要承担窗口和文件能力，不需要重写业务逻辑。

适合本项目的原因：

- 当前应用主要是本地阅读工具，不需要 Node 主进程生态。
- 前端功能已经完整，桌面化只是加壳和系统集成。
- 本地 EPUB 文件、配置和阅读状态都可以继续沿用前端存储，后续再逐步迁移到 Tauri 文件系统能力。

### 备选：Electron

优点：

- Node 能力强。
- 桌面端生态成熟。
- 调试门槛低。

缺点：

- 包体大。
- 对当前项目来说能力过剩。
- 更像新增一个完整桌面运行时，而不是轻量加壳。

结论：第一版优先使用 Tauri 2。

## 4. 目标架构

```text
GeminiReder/
  src/
    App.vue
    main.js
    assets/
      zcode.css
    components/
      reader/
        EpubReader.vue
      zcode/
        ZCodeShell.vue
        ZCodeTitleBar.vue
        ZCodeSidebar.vue
        ZCodeReaderSurface.vue
        ZCodeCommandBox.vue
    composables/
      useEpubReader.js
    stores/
      bookStore.js
  src-tauri/
    tauri.conf.json
    Cargo.toml
    src/
      main.rs
  package.json
  vite.config.js
```

前端职责：

- ZCode 工作台界面。
- EPUB 阅读渲染。
- 阅读状态、目录、书签、字体设置。
- Boss Mode 和伪装任务内容。

Tauri 职责：

- 桌面窗口创建。
- 无边框窗口控制。
- 应用图标和安装包。
- 后续可接入原生文件选择、最近打开文件、系统快捷键、托盘等能力。

## 5. 开发阶段

### 阶段 1：整理 Web 基线

目标：

让 Web 版 ZCode 外壳稳定，确保桌面化前没有重复阅读核心。

任务：

- 保留 `useEpubReader.js` 作为唯一 EPUB 阅读核心。
- 逐步从 `App.vue` 移除重复的 epubjs 初始化逻辑。
- `App.vue` 只负责选择 `gemini` / `zcode` shell 和挂载全局弹窗。
- 检查 `ZCodeShell.vue` 中的阅读器初始化、书籍切换、进度保存。
- 保证 `npm run build` 通过。

验收：

- Web 版能正常导入 EPUB。
- 点击左侧任务能切换当前书籍。
- 目录跳转正常。
- 书签添加和跳转正常。
- 字体设置能作用到 EPUB iframe。
- ZCode 和 Gemini shell 互相切换不会丢失当前阅读位置。

### 阶段 2：完善 ZCode 工作台体验

目标：

让应用第一屏就像一个代码工作台，而不是明显的阅读器。

任务：

- 默认 shell 可以改为 `zcode`。
- 左侧任务列表只显示 `fakeTitle`，不直接暴露真实书名。
- 顶部标题显示当前 fake task、项目名、分支名。
- 底部命令框回车默认执行下一页。
- `Ctrl+B` 切换 Boss Mode。
- `Ctrl+K` 打开目录，但视觉命名为 Search / Symbol。
- `Ctrl+D` 添加书签，但视觉命名为 Mark / Pin。
- `Esc` 关闭目录、设置、书签、文章面板。
- 为无书籍状态设计一个工作台风格空状态，引导导入 EPUB。

验收：

- 默认视觉接近代码工作台。
- 阅读区不明显暴露书籍封面和真实标题。
- 快捷键在输入框聚焦时不会误触发。
- Boss Mode 切换时保存并恢复阅读位置。

### 阶段 3：接入 Tauri 桌面壳

目标：

将现有 Vite 应用打包为桌面应用。

任务：

- 安装 Tauri CLI。
- 初始化 `src-tauri`。
- 配置 Tauri 使用当前 Vite 构建产物。
- 增加 package scripts：

```json
{
  "tauri": "tauri",
  "desktop:dev": "tauri dev",
  "desktop:build": "tauri build"
}
```

- 配置窗口尺寸：

```json
{
  "title": "ZCode",
  "width": 1200,
  "height": 800,
  "minWidth": 980,
  "minHeight": 640,
  "decorations": false,
  "resizable": true
}
```

- 配置应用图标。
- 确认 `npm run desktop:dev` 能启动桌面窗口。
- 确认 `npm run desktop:build` 能生成 Windows 安装包。

验收：

- 桌面窗口能启动。
- 页面不再依赖浏览器地址栏。
- ZCode 自定义标题栏完整显示。
- 打包产物能在 Windows 上安装和启动。

### 阶段 4：系统窗口控制

目标：

让 ZCode 标题栏真正控制桌面窗口。

任务：

- 在前端安装并使用 Tauri window API。
- 将 `ZCodeTitleBar.vue` 的最小化、最大化、关闭按钮绑定到 Tauri 窗口控制。
- 为标题栏拖拽区域添加拖动行为。
- 避免按钮区域触发拖拽。
- Windows 下检查缩放、最大化、恢复、关闭表现。

验收：

- 点击最小化按钮能最小化窗口。
- 点击最大化按钮能最大化和还原窗口。
- 点击关闭按钮能关闭窗口。
- 拖动顶部标题栏能移动窗口。
- 双击标题栏可选支持最大化/还原。

### 阶段 5：本地文件体验增强

目标：

让桌面版更像原生应用。

任务：

- 使用 Tauri 文件选择 API 替代临时创建 `input[type=file]`。
- 支持从菜单或快捷键 `Ctrl+O` 打开 EPUB。
- 支持记住最近打开书籍。
- 可选：支持把 EPUB 文件复制到应用数据目录，避免原路径变动导致丢失。
- 可选：将 metadata 从 localStorage 迁移到应用数据目录 JSON 文件。

验收：

- `Ctrl+O` 可打开系统文件选择器。
- 导入 EPUB 后立即出现在左侧任务列表。
- 重启应用后阅读进度、字体、书签仍保留。

### 阶段 6：伪装阅读规则固化

目标：

建立一套稳定的伪装策略，让阅读体验自然且不突兀。

任务：

- 为每本书生成稳定 fakeTitle，不频繁变化。
- 提供 fake project name，例如 `NoteWeb`、`Repository Audit`、`ZCodeProject`。
- 提供 fake task type，例如 Bug、Feature、Review、Docs。
- 左侧任务时间使用相对时间，例如 `9分`、`15小时`、`昨天`。
- Boss Mode 内容使用固定代码审查、日志分析、接口调试、构建报告模板。
- 阅读模式下 EPUB 内容使用深色文档风格，不显示封面大图作为第一视觉。
- 添加快速隐藏真实内容的热键，例如 `Ctrl+B`。

推荐 fake title 示例：

```text
Repository Detail Page
Request Entity Too Large
File AI Tool Integration
Kubernetes Pod Status
Nginx Access Log Review
Vue Component Refactor
Database Migration Script
TypeScript Interface Audit
```

验收：

- 左侧和顶部均不直接展示真实书名。
- Boss Mode 内容看起来像真实工作任务。
- 快速切换不破坏阅读进度。
- 伪装文案不出现“阅读器”“小说”“书架”等明显提示。

## 6. 快捷键设计

```text
Ctrl+B          切换 Boss Mode
Ctrl+Shift+L    切换 Gemini / ZCode shell
Ctrl+O          导入 EPUB
Ctrl+K          打开目录/搜索面板
Ctrl+D          添加书签/标记
ArrowRight      下一页
ArrowDown       下一页
ArrowLeft       上一页
ArrowUp         上一页
Enter           命令框聚焦时提交；其他情况可下一页
Esc             关闭当前弹窗或面板
```

快捷键规则：

- 输入框、textarea、contenteditable 聚焦时，不劫持翻页快捷键。
- Boss Mode 开启时，不响应阅读翻页快捷键。
- 切换 Boss Mode 前保存当前 CFI。
- 退出 Boss Mode 后恢复到保存的 CFI。

## 7. 数据存储策略

第一版继续使用：

- localStorage 保存书籍 metadata、当前书籍 ID、字体设置、文章 metadata。
- localforage 保存 EPUB Blob 和封面 Blob。

后续桌面增强：

- 使用 Tauri app data 目录保存应用数据。
- EPUB 文件可复制到应用数据目录。
- metadata 可迁移为 JSON 文件。
- 导出/导入阅读配置作为备份能力。

建议保留的字段：

```js
{
  id,
  title,
  author,
  fakeTitle,
  fakeProject,
  fakeType,
  cfi,
  bookmarks,
  addedAt,
  lastOpenedAt
}
```

## 8. UI 细节建议

整体风格：

- 深色工作台。
- 左侧 activity bar + sidebar。
- 中间 editor surface。
- 顶部 title bar + tabs。
- 底部 status bar + command box。

阅读区域：

- 最大正文宽度控制在 `760px - 920px`。
- 背景接近 `#111111`。
- 字体使用 `Fira Code`、`JetBrains Mono`、`Noto Sans SC`。
- 行高控制在 `1.7 - 1.9`。
- 图片降低存在感，不作为首屏视觉重点。

伪装任务区：

- 使用代码高亮色，但不要过度花哨。
- 内容可以是日志、diff、测试报告、接口分析。
- 保持像真实工作内容，而不是装饰性文本。

窗口：

- 无边框。
- 自定义标题栏。
- 左上角使用简单 `Z` 标识即可，不使用官方图标。
- 包名建议使用 `zcode-reader` 或 `code-workbench-reader`，不要冒充官方应用签名。

## 9. Tauri 初始命令草案

安装 Tauri CLI：

```powershell
npm install -D @tauri-apps/cli@latest
```

初始化 Tauri：

```powershell
npx tauri init
```

推荐初始化参数：

```text
App name: ZCode Reader
Window title: ZCode
Web assets location: ../dist
Dev server URL: http://localhost:5173
Frontend dev command: npm run dev
Frontend build command: npm run build
```

运行桌面开发版：

```powershell
npm run tauri dev
```

构建桌面安装包：

```powershell
npm run tauri build
```

## 10. 风险与处理

### 风险 1：`App.vue` 过大

处理：

- 不继续在 `App.vue` 堆新逻辑。
- 把阅读能力沉到 `useEpubReader.js`。
- 把外壳 UI 放在 `components/zcode`。

### 风险 2：EPUB iframe 样式失效

处理：

- 每次 rendered 后重新注入主题 CSS。
- 字体变化后重新调用 `applyFontTheme`。
- 切换书籍时销毁旧 book 和 rendition。

### 风险 3：桌面窗口拖拽和按钮冲突

处理：

- 标题栏背景区域设置拖拽。
- 按钮区域设置 no-drag。
- 单独测试最小化、最大化、关闭。

### 风险 4：伪装过度导致维护困难

处理：

- 数据层仍保留真实 title 和 author。
- UI 默认显示 fakeTitle。
- 设置面板中可以保留开发者调试入口查看真实信息。

### 风险 5：中文乱码

处理：

- 所有源码和 Markdown 文档统一保存为 UTF-8。
- 避免混用 GBK 保存。
- PowerShell 终端乱码不一定代表文件损坏，但需要用编辑器确认。

## 11. 第一版 MVP 范围

必须做：

- ZCode shell 作为桌面主界面。
- EPUB 导入、阅读、翻页、目录、书签、字体设置。
- Boss Mode 快捷切换。
- Tauri 桌面窗口。
- 无边框标题栏。
- Windows 安装包。

暂不做：

- 云同步。
- 全文搜索重构。
- 笔记系统大改。
- 插件系统。
- 复杂 AI 功能。
- 官方 ZCode 图标或签名冒充。

## 12. 推荐执行顺序

1. 跑通当前 Web 构建，确认没有新增错误。
2. 清理 `App.vue` 中重复阅读逻辑。
3. 补齐 ZCode shell 的快捷键和 Boss Mode。
4. 将默认 shell 改为 `zcode`。
5. 初始化 Tauri。
6. 接入无边框窗口和窗口控制按钮。
7. 打包 Windows 安装包。
8. 再做文件打开、最近书籍、托盘等增强功能。

## 13. 验收清单

Web 验收：

- `npm run build` 通过。
- 导入 EPUB 正常。
- 阅读器渲染正常。
- 字体设置生效。
- 目录跳转正常。
- 书签添加和跳转正常。
- ZCode shell 下翻页正常。
- Boss Mode 切换正常。

桌面验收：

- `npm run tauri dev` 可启动桌面窗口。
- 窗口默认尺寸合理。
- 自定义标题栏可拖拽。
- 最小化、最大化、关闭按钮可用。
- `npm run tauri build` 可生成安装包。
- 安装后应用可启动并读取历史书籍数据。

伪装体验验收：

- 首屏看起来像代码工作台。
- 左侧任务列表不暴露真实书名。
- 顶部 tab 不暴露真实书名。
- Boss Mode 内容看起来像工作任务。
- 快捷键可以迅速隐藏阅读内容。
- 退出 Boss Mode 后恢复原阅读位置。

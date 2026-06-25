# ZCode 风格桌面工作台外壳开发方案

## 目标

在当前 GeminiReder 项目中新增一套“ZCode 风格桌面工作台外壳”，复用现有 EPUB 阅读、书籍管理、目录、书签、字体设置和文章编辑能力。第一阶段先实现 Web 桌面工作台拟态，后续再按需要接入 Tauri 或 Electron 打包成真正桌面应用。

核心原则：

- 阅读能力不重写，继续使用现有 `epubjs` 渲染链路。
- 外观和业务解耦，避免继续把所有逻辑堆进 `App.vue`。
- 新外壳独立于当前 Gemini 风格外壳，保留快速回退能力。
- Gemini 风格外壳保留为默认入口，在现有界面新增按钮进入 ZCode 风格桌面工作台外壳。
- ZCode 风格只作为低调桌面工作台 UI，不改变书籍数据结构的核心语义。

## 当前项目判断

项目现状：

- 技术栈：Vite + Vue 3 + Pinia + Tailwind CSS。
- 阅读核心：`src/App.vue` 中的 `initReader`、`applyFontTheme`、`rendition` 相关逻辑。
- 数据核心：`src/stores/bookStore.js`，负责书籍、EPUB Blob、封面、书签、文章、字体设置。
- 已有能力：EPUB 导入、本地持久化、阅读进度、目录、书签、字体设置、文章编辑、Boss Mode。
- 主要问题：`App.vue` 过大，同时承担外壳布局、阅读器渲染、快捷键、弹窗、文章编辑入口等职责。

因此第一步不建议直接照着截图硬改 `App.vue`，而是先抽出“阅读核心”和“外壳布局”。

## 推荐架构

```text
src/
  App.vue
  components/
    reader/
      EpubReader.vue
      ReaderToolbar.vue
    shells/
      ZCodeShell.vue
      GeminiShell.vue
    zcode/
      ZCodeTitleBar.vue
      ZCodeSidebar.vue
      ZCodeActivityList.vue
      ZCodeCommandBox.vue
      ZCodeReaderSurface.vue
  composables/
    useEpubReader.js
    useShellMode.js
  stores/
    bookStore.js
  assets/
    zcode.css
```

### `App.vue`

只负责初始化 store、选择当前外壳、挂载全局弹窗。

建议状态：

```js
const shellMode = ref(localStorage.getItem('shell_mode') || 'gemini');
```

可选值：

- `zcode`：新的 ZCode 风格桌面工作台外壳。
- `gemini`：当前 Gemini 风格外壳，作为默认入口。

这样用户第一次进入仍看到熟悉的 Gemini 外壳，点击入口按钮后切到 ZCode 外壳；之后是否记住 ZCode 模式由产品策略决定。

### Gemini 外壳入口按钮

在当前 Gemini 风格外壳中新增一个明确入口按钮，用来进入 ZCode 风格桌面工作台外壳。

推荐位置：

- 顶部右侧工具区，放在书签/设置按钮附近。
- 左侧底部用户区设置按钮旁边，作为次级入口。

推荐第一版放在顶部右侧工具区，因为它是“切换工作台视图”的全局动作，不属于某一本书或某个用户设置。

按钮设计：

- 图标：优先使用 `lucide-vue-next` 中的 `PanelsTopLeft`、`MonitorCog`、`LayoutDashboard` 或 `Code2`。
- 文案：桌面工作台 / ZCode / 工作台。
- Tooltip：进入 ZCode 工作台。
- 点击行为：`setShellMode('zcode')`。

建议封装：

```js
const setShellMode = (mode) => {
  shellMode.value = mode;
  localStorage.setItem('shell_mode', mode);
};

const enterZCodeShell = () => {
  setShellMode('zcode');
};
```

在现有 Gemini 顶部工具区可以先加一个按钮：

```vue
<button
  class="p-2 rounded-full text-gem-text-secondary hover:bg-gem-hover hover:text-gem-text-primary transition-colors"
  title="进入 ZCode 工作台"
  @click="enterZCodeShell"
>
  <LayoutDashboard :size="20" />
</button>
```

同时在图标 import 中加入：

```js
import { LayoutDashboard } from 'lucide-vue-next';
```

ZCode 外壳也应该提供一个“返回 Gemini”入口，避免用户进入后找不到回退路径。

### `useEpubReader.js`

从 `App.vue` 抽出阅读器逻辑：

- `initReader`
- `destroyReader`
- `nextSection`
- `prevSection`
- `jumpToCfi`
- `navigateToChapter`
- `applyReaderTheme`
- `handleResize`
- `toc`
- `rendition`
- `readerArea`

这样 ZCode 外壳和 Gemini 外壳都能复用同一套阅读能力。

### `EpubReader.vue`

只负责提供 EPUB 渲染容器：

- 暴露 `readerArea` 给 `useEpubReader`。
- 接收当前书籍 ID。
- 处理挂载、卸载、resize。
- 不关心外壳长什么样。

### `ZCodeShell.vue`

新的主外壳，模拟截图中的桌面端结构：

- 左侧栏：任务、搜索、技能、分组/项目、书籍列表。
- 顶部栏：Z 图标、后退/前进、当前任务标题、项目名、分支、工具按钮。
- 主阅读区：表面是工作台/任务内容，实际嵌入 EPUB 阅读区。
- 底部命令框：复用现有 `fakeInput` 交互，支持翻页、追加文章、切换模式。

## ZCode 外观拆分

### 1. 顶部标题栏

组件：`ZCodeTitleBar.vue`

内容：

- 左侧 Z 图标。
- 后退/前进按钮。
- 当前标题，例如当前书籍的 `fakeTitle`。
- 项目胶囊，例如 `NoteWeb`。
- 分支胶囊，例如 `master`。
- 更多、文件、终端、布局、窗口控制图标。

Web 阶段窗口控制按钮只做视觉，不绑定系统窗口 API。Tauri 阶段再接入最小化、最大化、关闭。

### 2. 左侧栏

组件：`ZCodeSidebar.vue`

映射关系：

- “新建任务” -> 导入 EPUB。
- “搜索” -> 打开目录或全文搜索。
- “技能” -> 打开字体/阅读设置。
- “项目” -> 当前书籍集合。
- 任务列表 -> `bookStore.books`。
- 当前任务 -> `bookStore.currentBookId`。

书籍列表默认展示 `book.fakeTitle`，降低真实书名暴露。

### 3. 主阅读区

组件：`ZCodeReaderSurface.vue`

结构：

- 顶部一行状态文字，模拟任务对话。
- 中间是 EPUB 阅读容器。
- 可选显示“工作中 x 分 x 秒”状态。
- 下方保留代码变更/任务记录样式的装饰区。

阅读内容不建议做成很显眼的书本排版，而是保持低调的深色文档阅读风格：

- 背景：接近 `#141414`。
- 内容宽度：`760px - 920px`。
- 字体：优先 `Fira Code`、`JetBrains Mono`、`Noto Sans SC`。
- 行高：`1.75 - 1.9`。
- 颜色：低对比但可读。

### 4. 底部命令框

组件：`ZCodeCommandBox.vue`

功能：

- 输入内容后回车：默认下一页。
- 如果文章面板打开：追加到文章草稿。
- 按钮：新增、自动编辑、模型名、强度、停止。
- 视觉上贴近截图底部输入区。

## 状态与快捷键

建议新增：

```js
const shellMode = ref('gemini');
const disguiseMode = ref('reader'); // reader | fakeTask
```

快捷键：

- `Ctrl+B`：切换真实阅读区和伪装任务内容。
- `Ctrl+Shift+L`：切换 ZCode/Gemini 外壳。
- `Ctrl+O`：导入 EPUB。
- `Ctrl+K`：打开搜索/目录。
- `Ctrl+D`：添加书签。
- `ArrowRight` / `ArrowDown`：下一页。
- `ArrowLeft` / `ArrowUp`：上一页。
- `Esc`：关闭当前弹窗或侧边面板。

注意：输入框、textarea、contenteditable 聚焦时不要劫持翻页快捷键。

## 样式设计

新增 `src/assets/zcode.css`，不要直接污染现有 Gemini 变量。

建议变量：

```css
:root {
  --zc-bg: #141414;
  --zc-sidebar: #2a2a2a;
  --zc-sidebar-2: #242424;
  --zc-panel: #1f1f1f;
  --zc-panel-raised: #2b2b2b;
  --zc-border: #383838;
  --zc-border-soft: #303030;
  --zc-text: #d7d7d7;
  --zc-text-muted: #9a9a9a;
  --zc-text-dim: #6f6f6f;
  --zc-hover: #343434;
  --zc-active: #494949;
  --zc-accent: #f5b642;
  --zc-danger: #ff5a66;
  --zc-success: #37c871;
}
```

布局尺寸：

- 左侧栏宽度：`424px` 左右，贴近截图。
- 顶部栏高度：`76px - 78px`。
- 底部命令框宽度：`min(1180px, calc(100vw - sidebar - padding))`。
- 主阅读区最小高度：`calc(100vh - topbar - commandbox)`。

## 数据层是否需要改

第一阶段尽量不改 `bookStore.js` 的核心结构。

可以补充少量 UI 偏好：

```js
shellPreferences: {
  shellMode: 'gemini',
  disguiseMode: 'reader',
  sidebarCollapsed: false
}
```

如果不想改 store，也可以先放在 `localStorage`：

- `zcode_shell_mode`
- `zcode_disguise_mode`
- `zcode_sidebar_collapsed`

入口按钮状态建议仍使用通用键：

- `shell_mode`：当前外壳，`gemini` 或 `zcode`。

如果不希望下次打开时直接进入 ZCode，可以不持久化入口切换，只在当前会话内修改 `shellMode`。

## 开发阶段

### 阶段 1：结构拆分

目标：不改视觉，先让代码结构变清楚。

任务：

- 新建 `useEpubReader.js`。
- 新建 `EpubReader.vue`。
- 把 `App.vue` 中 EPUB 渲染和主题逻辑迁移进去。
- 保证现有 Gemini 外观可用。

验收：

- 导入 EPUB 正常。
- 继续阅读进度正常。
- 目录跳转正常。
- 书签跳转正常。
- 字体设置仍能作用到 EPUB iframe。
- `npm run build` 通过。

### 阶段 2：ZCode 静态外壳

目标：还原截图级别的桌面工作台外观。

任务：

- 新建 `ZCodeShell.vue`。
- 新建 `ZCodeTitleBar.vue`。
- 新建 `ZCodeSidebar.vue`。
- 新建 `ZCodeCommandBox.vue`。
- 新建 `src/assets/zcode.css`。
- 在 Gemini 外壳顶部工具区新增“进入 ZCode 工作台”按钮。
- 点击按钮后切换 `shellMode` 为 `zcode`。
- 在 ZCode 外壳顶部或侧边栏中提供“返回 Gemini”按钮。
- 先用静态假数据完成布局。

验收：

- 视觉结构接近截图。
- 桌面宽屏下没有明显溢出和重叠。
- 侧边栏、顶部栏、底部输入框尺寸稳定。
- 从 Gemini 外壳点击按钮可以进入 ZCode 外壳。
- 从 ZCode 外壳可以返回 Gemini 外壳。

### 阶段 3：接入真实阅读能力

目标：ZCode 外壳里能真实读 EPUB。

任务：

- `ZCodeShell.vue` 接入 `bookStore.books`。
- 侧边栏点击书籍切换当前书。
- 主区嵌入 `EpubReader.vue`。
- 命令框回车翻页。
- 顶部标题显示当前 `fakeTitle`。
- 目录、书签、字体设置从 ZCode 图标入口打开。
- 从 Gemini 进入 ZCode 后保留当前书籍和阅读位置。

验收：

- ZCode 外观下可以完整阅读。
- 切换书籍后阅读器重新初始化。
- 当前书籍高亮。
- 底部输入框不会遮挡阅读内容。
- Gemini/ZCode 来回切换不会丢失当前阅读进度。

### 阶段 4：伪装任务内容与 Boss Mode

目标：保留“真实阅读”和“任务伪装”两种内容态。

任务：

- 抽出现有 `showBossMode` 内容为 `FakeTaskView.vue`。
- `Ctrl+B` 在 `EpubReader` 与 `FakeTaskView` 间切换。
- 切换前保存当前 CFI。
- 切回后恢复阅读位置。

验收：

- 快捷键切换顺滑。
- 切换不丢阅读进度。
- Boss Mode 下其他阅读快捷键不误触。

### 阶段 5：桌面打包预留

目标：如果需要真正桌面端，接 Tauri。

建议优先 Tauri：

- 包体小。
- 当前 Vue/Vite 适配成本低。
- 可做无边框窗口、自定义标题栏。

Tauri 阶段新增能力：

- 自定义窗口控制按钮绑定系统 API。
- 默认窗口尺寸和最小尺寸。
- 应用图标。
- 本地文件打开体验优化。

## 风险点

### 1. `App.vue` 过大

直接在里面继续堆 ZCode UI 会很快失控。必须先抽出阅读器逻辑。

### 2. EPUB iframe 样式注入

当前阅读样式依赖向 EPUB iframe 注入 style。拆分后要保留：

- 每次 rendered 后重新注入。
- 字体/主题变化后重新注入。
- 切换书籍后清理旧实例。

### 3. 中文乱码

部分文件在终端里显示为乱码，可能是 PowerShell 编码显示问题，也可能是历史内容编码损坏。开发时建议统一检查编辑器编码为 UTF-8。

### 4. 桌面窗口控制

Web 阶段无法真正控制系统窗口。标题栏按钮先做视觉，Tauri/Electron 阶段再实现。

### 5. 视觉相似度

ZCode 风格要靠尺寸、间距、边框、阴影、字体重量和交互状态一起还原，不只是换颜色。需要最终用浏览器截图对照调细节。

## 第一版最小可行范围

第一版只做这些：

- 默认打开 Gemini 风格外壳。
- 在 Gemini 外壳新增一个按钮进入 ZCode 风格桌面工作台外壳。
- 在 ZCode 外壳提供返回 Gemini 外壳的入口。
- 左侧显示书籍任务列表。
- 支持导入 EPUB。
- 支持点击书籍阅读。
- 支持目录、书签、字体设置入口。
- 支持底部输入框回车下一页。
- 支持 `Ctrl+B` 切换伪装任务内容。
- 保留原 Gemini 外壳作为主入口和回退界面。

不做：

- 真正桌面 EXE。
- 全文搜索重构。
- 笔记/高亮大改。
- 复杂动画。
- 后端或云同步。

## 建议下一步

先执行阶段 1 和阶段 2：

1. 抽出 `useEpubReader.js` 和 `EpubReader.vue`。
2. 新建 `ZCodeShell.vue` 并完成静态布局。
3. 在 Gemini 外壳顶部工具区新增进入 ZCode 的按钮。
4. 让 `App.vue` 只负责选择 shell，并保证 Gemini/ZCode 可以互相切换。
5. 跑 `npm run build`，确认迁移没有破坏阅读能力。

完成后再进入真实数据接入和 Boss Mode 精修。

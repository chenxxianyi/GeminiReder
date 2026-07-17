<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useBookStore } from '../../stores/bookStore';
import { useEpubReader } from '../../composables/useEpubReader';
import ZCodeBrowserSurface from './ZCodeBrowserSurface.vue';
import ZCodeTitleBar from './ZCodeTitleBar.vue';
import ZCodeSidebar from './ZCodeSidebar.vue';
import ZCodeCommandBox from './ZCodeCommandBox.vue';
import ZCodeProgressPanel from './ZCodeProgressPanel.vue';
import ZCodeReaderSurface from './ZCodeReaderSurface.vue';
import EpubReader from '../reader/EpubReader.vue';
import TableOfContents from '../TableOfContents.vue';
import FontSettings from '../FontSettings.vue';

const bookStore = useBookStore();
const DEFAULT_BROWSER_URL = 'https://www.zhihu.com/';
const {
  readerArea,
  toc,
  activeTocHref,
  isLoading,
  initReader,
  destroyReader,
  applyFontTheme,
  nextSection,
  prevSection,
  jumpToCfi,
  navigateToChapter,
  getCurrentCfi,
  saveProgress
} = useEpubReader();

const sidebarCollapsed = ref(false);
const showTOC = ref(false);
const showFontSettings = ref(false);
const showProgressPanel = ref(false);
const progressStatus = ref('');
const showCommandBox = ref(true);
const surfaceMode = ref('home');
const previousSurfaceMode = ref('home');
const browserSurfaceRef = ref(null);
const browserState = ref({
  url: DEFAULT_BROWSER_URL,
  host: 'zhihu.com',
  title: 'zhihu.com',
  loading: false,
  ready: false,
  error: ''
});
const epubReaderRef = ref(null);
let readerInitTimer = null;

const currentBook = computed(() => {
  if (!bookStore.currentBookId) return null;
  return bookStore.books.find((book) => book.id === bookStore.currentBookId) || null;
});

const activeTabLabel = computed(() => {
  if (surfaceMode.value === 'browser') {
    return browserState.value.title || browserState.value.host || 'Web';
  }
  return currentBook.value?.fakeTitle || 'Workspace';
});

const statusProjectLabel = computed(() => {
  if (surfaceMode.value === 'browser') return 'Web';
  return currentBook.value?.fakeProject || 'NoteWeb';
});

const branchLabel = computed(() => {
  if (surfaceMode.value === 'browser') return browserState.value.host || 'web';
  return 'master';
});

const hasBlockingOverlay = computed(() => {
  return showTOC.value || showFontSettings.value || showProgressPanel.value || surfaceMode.value === 'boss';
});

const browserActive = computed(() => surfaceMode.value === 'browser' && !hasBlockingOverlay.value);

const ensureArticleSelected = () => {
  if (bookStore.currentArticleId) {
    const currentArticle = bookStore.getArticleById(bookStore.currentArticleId);
    if (currentArticle) return currentArticle;
  }

  if (bookStore.articles.length > 0) {
    const article = bookStore.articles[0];
    bookStore.setCurrentArticle(article.id);
    return article;
  }

  return bookStore.createArticle({
    title: 'Draft Notes',
    content: ''
  });
};

const isTypingTarget = (target) => {
  if (!target || !target.tagName) return false;
  const tagName = target.tagName.toUpperCase();
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
};

const syncReaderArea = () => {
  const exposedArea = epubReaderRef.value?.readerArea;
  if (exposedArea?.value) {
    readerArea.value = exposedArea.value;
  } else if (exposedArea) {
    readerArea.value = exposedArea;
  }
};

const scheduleReaderInit = () => {
  if (!bookStore.currentBookId) return;
  if (readerInitTimer) {
    window.clearTimeout(readerInitTimer);
  }
  readerInitTimer = window.setTimeout(async () => {
    readerInitTimer = null;
    await reinitReaderIfNeeded();
  }, 80);
};

const reinitReaderIfNeeded = async () => {
  if (!bookStore.currentBookId) return;
  await nextTick();
  syncReaderArea();
  await initReader();
};

const handleReaderReady = async () => {
  syncReaderArea();
  scheduleReaderInit();
};

const handleRefreshReader = async () => {
  if (!bookStore.currentBookId) return;
  saveProgress();
  await reinitReaderIfNeeded();
};

const handleSelectBook = (bookId) => {
  if (bookId === bookStore.currentBookId) {
    surfaceMode.value = 'reader';
    return;
  }
  saveProgress();
  bookStore.setCurrentBook(bookId);
  surfaceMode.value = 'reader';
};

const handleNewTask = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.epub';
  input.onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.epub')) return;
    const newBook = await bookStore.addBook(file);
    await handleSelectBook(newBook.id);
  };
  input.click();
};

const handleCommandSubmit = (content) => {
  if (surfaceMode.value === 'article') {
    const article = ensureArticleSelected();
    const nextContent = article.content ? `${article.content}\n\n${content}` : content;
    bookStore.updateArticle(article.id, { content: nextContent });
    return;
  }

  if (surfaceMode.value === 'reader') {
    nextSection();
  }
};

const handleToggleArticleCanvas = () => {
  if (surfaceMode.value === 'article') {
    surfaceMode.value = currentBook.value ? 'reader' : 'home';
    return;
  }

  surfaceMode.value = 'article';
  if (surfaceMode.value === 'article') {
    ensureArticleSelected();
  }
};

const handleToggleBossMode = async () => {
  if (surfaceMode.value !== 'boss') {
    if (surfaceMode.value === 'reader') saveProgress();
    previousSurfaceMode.value = surfaceMode.value;
    surfaceMode.value = 'boss';
    return;
  }

  surfaceMode.value = previousSurfaceMode.value || (currentBook.value ? 'reader' : 'home');
  if (surfaceMode.value === 'reader' && currentBook.value?.cfi) {
    await nextTick();
    await jumpToCfi(currentBook.value.cfi);
  }
};

const handleOpenBrowser = async () => {
  if (surfaceMode.value === 'reader') saveProgress();
  surfaceMode.value = 'browser';
  showCommandBox.value = false;
  await nextTick();
  browserSurfaceRef.value?.focusAddress();
};

const handleCloseBrowser = async () => {
  await browserSurfaceRef.value?.closeBrowser();
  surfaceMode.value = currentBook.value ? 'reader' : 'home';
};

const handleBrowserStateChange = (state) => {
  browserState.value = { ...browserState.value, ...state };
};

const handleBack = () => {
  if (surfaceMode.value === 'browser') {
    browserSurfaceRef.value?.goBack();
    return;
  }
  if (surfaceMode.value === 'reader') prevSection();
};

const handleForward = () => {
  if (surfaceMode.value === 'browser') {
    browserSurfaceRef.value?.goForward();
    return;
  }
  if (surfaceMode.value === 'reader') nextSection();
};

const handleOpenTOC = () => {
  if (!bookStore.currentBookId) return;
  showTOC.value = true;
};

const handleOpenProgressPanel = () => {
  showProgressPanel.value = !showProgressPanel.value;
  if (!bookStore.currentBookId) {
    progressStatus.value = 'No active workspace file.';
  }
};

const handleToggleCommandBox = () => {
  showCommandBox.value = !showCommandBox.value;
};

const handleOpenSettings = () => {
  showFontSettings.value = true;
};

const buildProgressLabel = () => {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const scope = currentBook.value?.fakeTitle || 'workspace';
  return `trace: ${scope} @ ${time}`;
};

const handleAddProgressRecord = () => {
  if (!bookStore.currentBookId) {
    progressStatus.value = 'No active workspace file.';
    showProgressPanel.value = true;
    return;
  }

  const cfi = getCurrentCfi();
  if (!cfi) {
    progressStatus.value = 'Cursor position is not ready. Try again after the page settles.';
    showProgressPanel.value = true;
    return;
  }

  const record = bookStore.addBookmark(bookStore.currentBookId, cfi, buildProgressLabel());
  progressStatus.value = record ? `Checkpoint saved: ${record.label}` : 'Checkpoint write failed.';
  showProgressPanel.value = true;
};

const handleJumpToProgressRecord = async (cfi) => {
  if (!cfi) return;
  progressStatus.value = 'Restoring checkpoint...';
  showProgressPanel.value = false;
  await jumpToCfi(cfi);
  applyFontTheme();
  progressStatus.value = 'Checkpoint restored.';
};

const handleRemoveProgressRecord = (recordId) => {
  if (!bookStore.currentBookId || !recordId) return;
  bookStore.removeBookmark(bookStore.currentBookId, recordId);
  progressStatus.value = 'Checkpoint dropped.';
};

const handleFontApply = () => {
  applyFontTheme();
};

const handleToggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const handleGlobalKeydown = async (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    sidebarCollapsed.value = !sidebarCollapsed.value;
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    await handleToggleBossMode();
    return;
  }

  if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    await handleOpenBrowser();
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'r' && surfaceMode.value === 'browser') {
    event.preventDefault();
    browserSurfaceRef.value?.reload();
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'o') {
    event.preventDefault();
    handleNewTask();
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    handleNewTask();
    return;
  }

  if (event.key === 'Escape') {
    if (showTOC.value || showFontSettings.value || showProgressPanel.value) {
      event.preventDefault();
      showTOC.value = false;
      showFontSettings.value = false;
      showProgressPanel.value = false;
      return;
    }
  }

  if (isTypingTarget(event.target)) {
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    handleOpenTOC();
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    handleAddProgressRecord();
    return;
  }

  if (surfaceMode.value === 'boss') {
    return;
  }

  if (surfaceMode.value === 'browser') {
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      browserSurfaceRef.value?.goBack();
    } else if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      browserSurfaceRef.value?.goForward();
    }
    return;
  }

  if (surfaceMode.value === 'reader' && (event.key === 'ArrowLeft' || event.key === 'ArrowUp')) {
    event.preventDefault();
    prevSection();
    return;
  }

  if (surfaceMode.value === 'reader' && (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Enter')) {
    event.preventDefault();
    nextSection();
  }
};

onMounted(async () => {
  await bookStore.init();
  await nextTick();
  syncReaderArea();

  if (bookStore.currentBookId) {
    surfaceMode.value = 'reader';
    scheduleReaderInit();
  } else {
    surfaceMode.value = 'home';
  }

  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  if (readerInitTimer) {
    window.clearTimeout(readerInitTimer);
    readerInitTimer = null;
  }
  window.removeEventListener('keydown', handleGlobalKeydown);
  destroyReader();
});

watch(
  () => epubReaderRef.value?.readerArea,
  async () => {
    syncReaderArea();
    if (bookStore.currentBookId && readerArea.value && !isLoading.value) {
      scheduleReaderInit();
    }
  }
);

watch(surfaceMode, async (mode, previousMode) => {
  if (previousMode === 'reader' && mode !== 'reader') {
    saveProgress();
    destroyReader();
  }

  if (previousMode === 'browser' && mode !== 'browser') {
    await browserSurfaceRef.value?.closeBrowser();
  }

  if (mode === 'reader' && bookStore.currentBookId) {
    await nextTick();
    scheduleReaderInit();
  }
});
</script>

<template>
  <div class="zcode-shell zcode-app flex h-screen w-screen overflow-hidden">
    <ZCodeSidebar
      :collapsed="sidebarCollapsed"
      :current-book-id="bookStore.currentBookId"
      @select-book="handleSelectBook"
      @new-task="handleNewTask"
      @back="handleBack"
      @forward="handleForward"
      @open-search="handleOpenTOC"
      @open-browser="handleOpenBrowser"
      @open-settings="handleOpenSettings"
      @toggle-collapsed="handleToggleSidebar"
    />

    <main class="zcode-main-workbench">
      <ZCodeTitleBar
        :title="activeTabLabel"
        :project-name="statusProjectLabel"
        :branch-name="branchLabel"
        :command-open="showCommandBox"
        :sidebar-collapsed="sidebarCollapsed"
        @back="handleBack"
        @forward="handleForward"
        @toggle-sidebar="handleToggleSidebar"
        @open-toc="handleOpenTOC"
        @open-progress="handleOpenProgressPanel"
        @toggle-command="handleToggleCommandBox"
        @open-settings="handleOpenSettings"
      />

      <div class="zcode-main-stage">
        <ZCodeReaderSurface
          :mode="surfaceMode"
          @toggle-boss-mode="handleToggleBossMode"
          @toggle-article-canvas="handleToggleArticleCanvas"
          @refresh-reader="handleRefreshReader"
        >
          <EpubReader
            v-if="surfaceMode === 'reader'"
            ref="epubReaderRef"
            :book-id="bookStore.currentBookId"
            min-height="100%"
            max-height="100%"
            @ready="handleReaderReady"
            @loaded="handleReaderReady"
          />

          <template #browser>
            <ZCodeBrowserSurface
              ref="browserSurfaceRef"
              :active="browserActive"
              :command-open="showCommandBox"
              :initial-url="browserState.url"
              :suspended="hasBlockingOverlay"
              @close="handleCloseBrowser"
              @state-change="handleBrowserStateChange"
            />
          </template>
        </ZCodeReaderSurface>

        <ZCodeCommandBox
          v-if="showCommandBox"
          :class="{ 'is-reader-active': bookStore.currentBookId || surfaceMode === 'browser' }"
          :is-article-mode="surfaceMode === 'article'"
          :placeholder="surfaceMode === 'browser' ? '网页模式下可通过上方地址栏访问内容' : (bookStore.currentBookId ? '提出后续修改要求' : '向 ZCode 提问，输入 @ 添加文件，/ 使用命令，$ 使用技能，# 关联对话')"
          model-name="GLM-5.2"
          :project-name="statusProjectLabel"
          :branch-name="branchLabel"
          @submit="handleCommandSubmit"
          @toggle-article-mode="handleToggleArticleCanvas"
        />
      </div>
    </main>

    <TableOfContents
      :show="showTOC"
      :toc="toc"
      :active-href="activeTocHref"
      :book-title="currentBook?.title || ''"
      @close="showTOC = false"
      @navigate="navigateToChapter"
    />

    <FontSettings :show="showFontSettings" @close="showFontSettings = false" @apply="handleFontApply" />

    <ZCodeProgressPanel
      :show="showProgressPanel"
      :book-id="bookStore.currentBookId"
      :project-name="statusProjectLabel"
      :branch-name="branchLabel"
      :status="progressStatus"
      @close="showProgressPanel = false"
      @add-record="handleAddProgressRecord"
      @jump-to="handleJumpToProgressRecord"
      @remove-record="handleRemoveProgressRecord"
    />
  </div>
</template>

<style scoped>
.zcode-shell {
  background-color: var(--zc-bg);
}
</style>

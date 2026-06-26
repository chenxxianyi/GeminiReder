<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useBookStore } from '../../stores/bookStore';
import { useEpubReader } from '../../composables/useEpubReader';
import ZCodeTitleBar from './ZCodeTitleBar.vue';
import ZCodeSidebar from './ZCodeSidebar.vue';
import ZCodeCommandBox from './ZCodeCommandBox.vue';
import ZCodeReaderSurface from './ZCodeReaderSurface.vue';
import EpubReader from '../reader/EpubReader.vue';
import TableOfContents from '../TableOfContents.vue';
import FontSettings from '../FontSettings.vue';
import BookmarkPanel from '../BookmarkPanel.vue';

const bookStore = useBookStore();
const ZLIB_URL = 'https://z-library.sk/';
const {
  readerArea,
  toc,
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
const showBookmarks = ref(false);
const showBossMode = ref(false);
const showArticleCanvas = ref(false);
const showCommandBox = ref(true);
const epubReaderRef = ref(null);

const currentBook = computed(() => {
  if (!bookStore.currentBookId) return null;
  return bookStore.books.find((book) => book.id === bookStore.currentBookId) || null;
});

const activeTabLabel = computed(() => {
  return currentBook.value?.fakeTitle || 'Workspace';
});

const statusProjectLabel = computed(() => currentBook.value?.fakeProject || 'NoteWeb');

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

const reinitReaderIfNeeded = async () => {
  if (!bookStore.currentBookId) return;
  await nextTick();
  syncReaderArea();
  await initReader();
};

const handleSelectBook = async (bookId) => {
  if (bookId === bookStore.currentBookId) return;
  saveProgress();
  bookStore.setCurrentBook(bookId);
  showBossMode.value = false;
  showArticleCanvas.value = false;
  await reinitReaderIfNeeded();
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
  if (showArticleCanvas.value) {
    const article = ensureArticleSelected();
    const nextContent = article.content ? `${article.content}\n\n${content}` : content;
    bookStore.updateArticle(article.id, { content: nextContent });
    return;
  }

  nextSection();
};

const handleToggleArticleCanvas = () => {
  showBossMode.value = false;
  showArticleCanvas.value = !showArticleCanvas.value;
  if (showArticleCanvas.value) {
    ensureArticleSelected();
  }
};

const handleToggleBossMode = async () => {
  if (!showBossMode.value) {
    saveProgress();
  }

  showBossMode.value = !showBossMode.value;

  if (showBossMode.value) {
    return;
  }

  if (currentBook.value?.cfi) {
    await nextTick();
    await jumpToCfi(currentBook.value.cfi);
  }
};

const handleOpenTOC = () => {
  if (!bookStore.currentBookId) return;
  showTOC.value = true;
};

const handleOpenBookmarks = () => {
  if (!bookStore.currentBookId) return;
  showBookmarks.value = true;
};

const handleToggleCommandBox = () => {
  showCommandBox.value = !showCommandBox.value;
};

const handleOpenSettings = () => {
  showFontSettings.value = true;
};

const openInBrowser = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

const handleOpenZLib = async () => {
  if (!isTauri()) {
    openInBrowser(ZLIB_URL);
    return;
  }

  try {
    await invoke('open_zlib');
  } catch (error) {
    console.error('Failed to open Z-Lib from Tauri command:', error);
    openInBrowser(ZLIB_URL);
  }
};

const handleAddBookmark = () => {
  if (!bookStore.currentBookId) return;

  const cfi = getCurrentCfi();
  if (!cfi) return;

  const label = window.prompt('Pin label', `Pin ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  if (label === null) return;

  const nextLabel = label.trim() || `Pin ${new Date().toLocaleDateString()}`;
  bookStore.addBookmark(bookStore.currentBookId, cfi, nextLabel);
  showBookmarks.value = true;
};

const handleJumpToBookmark = (cfi) => {
  jumpToCfi(cfi);
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
    if (showTOC.value || showFontSettings.value || showBookmarks.value) {
      event.preventDefault();
      showTOC.value = false;
      showFontSettings.value = false;
      showBookmarks.value = false;
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
    handleAddBookmark();
    return;
  }

  if (showBossMode.value) {
    return;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    prevSection();
    return;
  }

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Enter') {
    event.preventDefault();
    nextSection();
  }
};

onMounted(async () => {
  await bookStore.init();
  await nextTick();
  syncReaderArea();

  if (bookStore.currentBookId) {
    await initReader();
  }

  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  destroyReader();
});

watch(
  () => epubReaderRef.value?.readerArea,
  async () => {
    syncReaderArea();
    if (bookStore.currentBookId && readerArea.value && !isLoading.value) {
      await initReader();
    }
  }
);
</script>

<template>
  <div class="zcode-shell zcode-app flex h-screen w-screen overflow-hidden">
    <ZCodeSidebar
      :collapsed="sidebarCollapsed"
      :current-book-id="bookStore.currentBookId"
      @select-book="handleSelectBook"
      @new-task="handleNewTask"
      @back="prevSection"
      @forward="nextSection"
      @open-search="handleOpenTOC"
      @open-zlib="handleOpenZLib"
      @open-settings="handleOpenSettings"
      @toggle-collapsed="handleToggleSidebar"
    />

    <main class="zcode-main-workbench">
      <ZCodeTitleBar
        :title="activeTabLabel"
        :project-name="statusProjectLabel"
        branch-name="master"
        :command-open="showCommandBox"
        @back="prevSection"
        @forward="nextSection"
        @toggle-sidebar="handleToggleSidebar"
        @open-toc="handleOpenTOC"
        @open-bookmarks="handleOpenBookmarks"
        @toggle-command="handleToggleCommandBox"
        @open-settings="handleOpenSettings"
      />

      <div class="zcode-main-stage">
        <ZCodeReaderSurface
          :show-boss-mode="showBossMode"
          :show-article-canvas="showArticleCanvas"
          @toggle-boss-mode="handleToggleBossMode"
          @toggle-article-canvas="handleToggleArticleCanvas"
        >
          <EpubReader
            ref="epubReaderRef"
            :book-id="bookStore.currentBookId"
            min-height="100%"
            max-height="100%"
          />
        </ZCodeReaderSurface>

        <ZCodeCommandBox
          v-if="showCommandBox"
          :class="{ 'is-reader-active': bookStore.currentBookId }"
          :is-article-mode="showArticleCanvas"
          :project-name="statusProjectLabel"
          branch-name="master"
          @submit="handleCommandSubmit"
          @toggle-article-mode="handleToggleArticleCanvas"
        />
      </div>
    </main>

    <TableOfContents
      :show="showTOC"
      :toc="toc"
      :book-title="currentBook?.title || ''"
      @close="showTOC = false"
      @navigate="navigateToChapter"
    />

    <FontSettings :show="showFontSettings" @close="showFontSettings = false" @apply="handleFontApply" />

    <BookmarkPanel
      :show="showBookmarks"
      :book-id="bookStore.currentBookId"
      @close="showBookmarks = false"
      @jump-to="handleJumpToBookmark"
      @add-bookmark="handleAddBookmark"
    />
  </div>
</template>

<style scoped>
.zcode-shell {
  background-color: var(--zc-bg);
}
</style>

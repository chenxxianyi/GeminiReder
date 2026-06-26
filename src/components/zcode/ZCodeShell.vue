<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useBookStore } from '../../stores/bookStore';
import { useEpubReader } from '../../composables/useEpubReader';
import ZCodeActivityBar from './ZCodeActivityBar.vue';
import ZCodeTitleBar from './ZCodeTitleBar.vue';
import ZCodeSidebar from './ZCodeSidebar.vue';
import ZCodeCommandBox from './ZCodeCommandBox.vue';
import ZCodeReaderSurface from './ZCodeReaderSurface.vue';
import EpubReader from '../reader/EpubReader.vue';
import TableOfContents from '../TableOfContents.vue';
import FontSettings from '../FontSettings.vue';
import BookmarkPanel from '../BookmarkPanel.vue';
import { FileText, X, GitBranch } from 'lucide-vue-next';

const emit = defineEmits(['switch-to-gemini']);

const bookStore = useBookStore();
const {
  readerArea,
  toc,
  isDark,
  isLoading,
  initReader,
  destroyReader,
  applyFontTheme,
  handleResize,
  nextSection,
  prevSection,
  jumpToCfi,
  navigateToChapter,
  handleKeydown,
  getCurrentCfi,
  saveProgress,
  toggleTheme
} = useEpubReader();

// UI State
const sidebarCollapsed = ref(false);
const showTOC = ref(false);
const showFontSettings = ref(false);
const showBookmarks = ref(false);
const showBossMode = ref(false);
const showArticleCanvas = ref(false);
const showCommandBox = ref(false);
const activeActivityItem = ref('explorer');

// EPUB Reader ref
const epubReaderRef = ref(null);

// Current book info
const currentBook = computed(() => {
  if (!bookStore.currentBookId) return null;
  return bookStore.books.find(b => b.id === bookStore.currentBookId);
});

// Handle book selection from sidebar
const handleSelectBook = async (bookId) => {
  if (bookId === bookStore.currentBookId) return;

  // Save progress before switching
  if (bookStore.currentBookId) {
    saveProgress();
  }

  bookStore.setCurrentBook(bookId);

  // Wait for next tick to ensure readerArea is ready
  await nextTick();

  // Re-init reader with new book
  await initReader();
};

// Handle new task (import EPUB)
const handleNewTask = () => {
  // Trigger file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.epub';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.epub')) {
      await bookStore.addBook(file);
      const newBook = bookStore.books[bookStore.books.length - 1];
      await handleSelectBook(newBook.id);
    }
  };
  input.click();
};

// Handle command box submit
const handleCommandSubmit = (content) => {
  if (showArticleCanvas.value) {
    // Append to article
    const article = bookStore.articles[0];
    if (article) {
      const nextContent = article.content ? `${article.content}\n\n${content}` : content;
      bookStore.updateArticle(article.id, { content: nextContent });
    }
  } else {
    // Next page
    nextSection();
  }
};

// Handle toggle article mode
const handleToggleArticleCanvas = () => {
  showBossMode.value = false;
  showArticleCanvas.value = !showArticleCanvas.value;

  // Ensure article exists
  if (showArticleCanvas.value && bookStore.articles.length === 0) {
    bookStore.createArticle({ title: 'New Article', content: '' });
  }
};

// Handle toggle boss mode
const handleToggleBossMode = async () => {
  // Save current progress before switching
  if (!showBossMode.value) {
    saveProgress();
  }

  showBossMode.value = !showBossMode.value;
  showArticleCanvas.value = false;

  // Restore position after switching back
  if (!showBossMode.value && currentBook.value?.cfi) {
    await nextTick();
    await jumpToCfi(currentBook.value.cfi);
  }
};

// Handle switch to Gemini shell
const handleSwitchToGemini = () => {
  saveProgress();
  emit('switch-to-gemini');
};

// Handle open TOC
const handleOpenTOC = () => {
  showTOC.value = true;
};

const handleToggleCommandBox = async () => {
  showCommandBox.value = !showCommandBox.value;
  await nextTick();
  handleResize();
};

// Handle open settings
const handleOpenSettings = (type) => {
  showFontSettings.value = true;
};

// Handle add bookmark
const handleAddBookmark = () => {
  if (!bookStore.currentBookId) return;

  const cfi = getCurrentCfi();
  if (cfi) {
    const label = prompt('请输入书签名称：', `书签 ${new Date().toLocaleString('zh-CN')}`);
    if (label !== null && label.trim()) {
      bookStore.addBookmark(bookStore.currentBookId, cfi, label.trim());
      alert('书签添加成功！');
    }
  }
};

// Handle jump to bookmark
const handleJumpToBookmark = (cfi) => {
  jumpToCfi(cfi);
};

// Handle font apply
const handleFontApply = () => {
  applyFontTheme();
};

// Toggle sidebar
const handleToggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

// Handle activity item change
const handleActivityChange = (itemId) => {
  activeActivityItem.value = itemId;

  // Handle special items
  if (itemId === 'search') {
    showTOC.value = true;
  } else if (itemId === 'settings') {
    showFontSettings.value = true;
  }
};

// Keyboard shortcuts
const handleGlobalKeydown = (e) => {
  // Ctrl+B: Toggle boss mode
  if (e.ctrlKey && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    handleToggleBossMode();
    return;
  }

  // Skip if in boss mode or typing
  if (showBossMode.value) return;
  if (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName.toUpperCase())) return;

  // Ctrl+K: Open TOC
  if (e.ctrlKey && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    showTOC.value = true;
    return;
  }

  // Ctrl+D: Add bookmark
  if (e.ctrlKey && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    handleAddBookmark();
    return;
  }

  // Arrow keys for navigation
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      prevSection();
    } else {
      nextSection();
    }
    e.preventDefault();
  }
};

// Initialize
onMounted(async () => {
  await bookStore.init();

  // Sync readerArea ref with epubReaderRef
  if (epubReaderRef.value?.readerArea) {
    readerArea.value = epubReaderRef.value.readerArea;
  }

  // Init reader if we have a current book
  if (bookStore.currentBookId) {
    await nextTick();
    await initReader();
  }

  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  destroyReader();
});

// Watch for epubReaderRef to be ready
watch(() => epubReaderRef.value?.readerArea, (newVal) => {
  if (newVal) {
    readerArea.value = newVal;
  }
});
</script>

<template>
  <div class="zcode-shell zcode-app flex h-screen w-screen overflow-hidden">
    <!-- Activity Bar (Leftmost vertical icon bar) -->
    <ZCodeActivityBar
      :active-item="activeActivityItem"
      @change-item="handleActivityChange"
    />

    <!-- Sidebar -->
    <ZCodeSidebar
      :collapsed="sidebarCollapsed"
      :current-book-id="bookStore.currentBookId"
      @select-book="handleSelectBook"
      @new-task="handleNewTask"
      @open-search="showTOC = true"
      @open-settings="handleOpenSettings"
      @toggle-collapsed="handleToggleSidebar"
    />

    <!-- Main content area -->
    <div class="flex-1 flex flex-col min-w-0 bg-[var(--zc-bg)]">
      <!-- Title bar -->
      <ZCodeTitleBar
        :title="currentBook?.fakeTitle || 'No Task Selected'"
        project-name="GeminiReader"
        branch-name="main"
        @back="prevSection"
        @forward="nextSection"
        @toggle-sidebar="handleToggleSidebar"
        :command-open="showCommandBox"
        @open-toc="handleOpenTOC"
        @toggle-command="handleToggleCommandBox"
        @open-settings="handleOpenSettings"
        @switch-to-gemini="handleSwitchToGemini"
      />

      <!-- Tabs bar -->
      <div class="zcode-tabs-container">
        <div class="zcode-tab" :class="{ active: bookStore.currentBookId }">
          <FileText :size="14" class="mr-2" />
          <span class="truncate">{{ currentBook?.fakeTitle || 'Welcome' }}</span>
          <button class="ml-2 hover:bg-[var(--zc-hover)] rounded p-0.5">
            <X :size="12" />
          </button>
        </div>
      </div>

      <!-- Reader surface -->
      <ZCodeReaderSurface
        :show-boss-mode="showBossMode"
        :show-article-canvas="showArticleCanvas"
        @toggle-boss-mode="handleToggleBossMode"
        @toggle-article-canvas="handleToggleArticleCanvas"
      >
        <!-- EPUB Reader slot -->
        <EpubReader
          ref="epubReaderRef"
          :book-id="bookStore.currentBookId"
          min-height="100%"
          max-height="100%"
        />
      </ZCodeReaderSurface>

      <ZCodeCommandBox
        v-if="showCommandBox"
        :is-article-mode="showArticleCanvas"
        @submit="handleCommandSubmit"
        @toggle-article-mode="handleToggleArticleCanvas"
      />

      <!-- Status bar -->
      <div class="zcode-status-bar">
        <div class="flex items-center space-x-2">
          <div class="zcode-status-item">
            <GitBranch :size="12" class="mr-1" />
            <span>main</span>
          </div>
          <div class="zcode-status-item">
            <span>0 errors, 0 warnings</span>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <div class="zcode-status-item">
            <span>Ln 1, Col 1</span>
          </div>
          <div class="zcode-status-item">
            <span>UTF-8</span>
          </div>
          <div class="zcode-status-item">
            <span>TypeScript</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <TableOfContents
      :show="showTOC"
      :toc="toc"
      :book-title="currentBook?.title || ''"
      @close="showTOC = false"
      @navigate="navigateToChapter"
    />

    <FontSettings
      :show="showFontSettings"
      @close="showFontSettings = false"
      @apply="handleFontApply"
    />

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

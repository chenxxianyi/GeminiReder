<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useBookStore } from '../stores/bookStore';
import { useEpubReader } from '../composables/useEpubReader';
import EpubReader from './reader/EpubReader.vue';
import TableOfContents from './TableOfContents.vue';
import BookmarkPanel from './BookmarkPanel.vue';
import FontSettings from './FontSettings.vue';
import {
  FolderOpen,
  ListTree,
  Bookmark,
  Type,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next';

const emit = defineEmits(['switch-shell']);

const bookStore = useBookStore();
const {
  readerArea,
  toc,
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

const epubReaderRef = ref(null);
const showTOC = ref(false);
const showBookmarks = ref(false);
const showFontSettings = ref(false);

const currentBook = computed(() => {
  if (!bookStore.currentBookId) return null;
  return bookStore.books.find((book) => book.id === bookStore.currentBookId) || null;
});

const syncReaderArea = () => {
  const exposedArea = epubReaderRef.value?.readerArea;
  if (exposedArea?.value) {
    readerArea.value = exposedArea.value;
  } else if (exposedArea) {
    readerArea.value = exposedArea;
  }
};

const initCurrentBook = async () => {
  if (!bookStore.currentBookId) return;
  await nextTick();
  syncReaderArea();
  await initReader();
};

const openFilePicker = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.epub';
  input.onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.epub')) return;
    const newBook = await bookStore.addBook(file);
    bookStore.setCurrentBook(newBook.id);
    await initCurrentBook();
  };
  input.click();
};

const selectBook = async (bookId) => {
  if (bookId === bookStore.currentBookId) return;
  saveProgress();
  bookStore.setCurrentBook(bookId);
  await initCurrentBook();
};

const addBookmark = () => {
  if (!bookStore.currentBookId) return;
  const cfi = getCurrentCfi();
  if (!cfi) return;

  const label = window.prompt('Pin label', `Pin ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  if (label === null) return;

  bookStore.addBookmark(bookStore.currentBookId, cfi, label.trim() || `Pin ${new Date().toLocaleDateString()}`);
  showBookmarks.value = true;
};

const handleGlobalKeydown = (event) => {
  const target = event.target;
  const tagName = target?.tagName?.toUpperCase();
  const isTyping = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);

  if (event.ctrlKey && event.key.toLowerCase() === 'o') {
    event.preventDefault();
    openFilePicker();
    return;
  }

  if (isTyping) return;

  if (event.ctrlKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    showTOC.value = true;
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    addBookmark();
    return;
  }

  if (event.key === 'Escape') {
    showTOC.value = false;
    showBookmarks.value = false;
    showFontSettings.value = false;
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
  saveProgress();
  window.removeEventListener('keydown', handleGlobalKeydown);
  destroyReader();
});

watch(
  () => epubReaderRef.value?.readerArea,
  () => {
    syncReaderArea();
  }
);
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-gem-bg text-gem-text-primary">
    <aside class="hidden w-[300px] border-r border-gem-border bg-gem-sidebar lg:flex lg:flex-col">
      <div class="flex items-center justify-between border-b border-gem-border px-4 py-4">
        <div>
          <div class="text-xs uppercase tracking-[0.08em] text-gem-text-muted">Classic Shell</div>
          <div class="mt-1 text-sm font-medium">Reader Workspace</div>
        </div>
        <button
          class="rounded-full p-2 text-gem-text-secondary transition-colors hover:bg-gem-hover hover:text-gem-text-primary"
          title="Switch to ZCode"
          @click="emit('switch-shell')"
        >
          <LayoutDashboard :size="18" />
        </button>
      </div>

      <div class="space-y-2 border-b border-gem-border px-4 py-4">
        <button
          class="flex w-full items-center justify-between rounded-lg bg-gem-surface px-3 py-2 text-sm transition-colors hover:bg-gem-hover"
          @click="openFilePicker"
        >
          <span class="flex items-center">
            <FolderOpen :size="16" class="mr-2" />
            Open EPUB
          </span>
          <span class="text-xs text-gem-text-muted">Ctrl+O</span>
        </button>
        <button
          class="flex w-full items-center justify-between rounded-lg bg-gem-surface px-3 py-2 text-sm transition-colors hover:bg-gem-hover"
          @click="showTOC = true"
        >
          <span class="flex items-center">
            <ListTree :size="16" class="mr-2" />
            Search / Symbol
          </span>
          <span class="text-xs text-gem-text-muted">Ctrl+K</span>
        </button>
        <button
          class="flex w-full items-center justify-between rounded-lg bg-gem-surface px-3 py-2 text-sm transition-colors hover:bg-gem-hover"
          @click="showBookmarks = true"
        >
          <span class="flex items-center">
            <Bookmark :size="16" class="mr-2" />
            Pins
          </span>
          <span class="text-xs text-gem-text-muted">Ctrl+D</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-3 py-4">
        <div class="mb-3 px-2 text-xs uppercase tracking-[0.08em] text-gem-text-muted">Recent Tasks</div>
        <button
          v-for="book in bookStore.books"
          :key="book.id"
          class="mb-1 flex w-full items-start rounded-lg px-3 py-3 text-left transition-colors hover:bg-gem-hover"
          :class="book.id === bookStore.currentBookId ? 'bg-gem-blue-bg text-gem-blue' : 'bg-transparent text-gem-text-primary'"
          @click="selectBook(book.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ book.fakeTitle }}</div>
            <div class="mt-1 text-xs" :class="book.id === bookStore.currentBookId ? 'text-gem-blue' : 'text-gem-text-muted'">
              {{ book.fakeProject }} · {{ book.fakeType }}
            </div>
          </div>
        </button>

        <div
          v-if="bookStore.books.length === 0"
          class="rounded-lg border border-dashed border-gem-border px-4 py-6 text-sm text-gem-text-muted"
        >
          No task files yet.
        </div>
      </div>
    </aside>

    <main class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center justify-between border-b border-gem-border px-4 py-3">
        <div class="min-w-0">
          <div class="truncate text-lg font-medium">
            {{ currentBook?.title || 'Open an EPUB to begin' }}
          </div>
          <div class="mt-1 text-sm text-gem-text-muted">
            {{ currentBook?.author || 'Classic reading surface' }}
          </div>
        </div>

        <div class="ml-4 flex items-center space-x-2">
          <button class="rounded-full p-2 transition-colors hover:bg-gem-hover" title="Previous" @click="prevSection">
            <ChevronLeft :size="18" />
          </button>
          <button class="rounded-full p-2 transition-colors hover:bg-gem-hover" title="Next" @click="nextSection">
            <ChevronRight :size="18" />
          </button>
          <button class="rounded-full p-2 transition-colors hover:bg-gem-hover" title="Reader Theme" @click="showFontSettings = true">
            <Type :size="18" />
          </button>
          <button
            class="rounded-full p-2 transition-colors hover:bg-gem-hover"
            title="Switch to ZCode"
            @click="emit('switch-shell')"
          >
            <LayoutDashboard :size="18" />
          </button>
        </div>
      </div>

      <div v-if="!bookStore.currentBookId" class="flex flex-1 items-center justify-center px-8">
        <div class="max-w-lg text-center">
          <h2 class="mb-3 text-2xl font-medium">Classic reading shell</h2>
          <p class="mb-6 text-sm leading-6 text-gem-text-muted">
            This shell keeps the same library and progress data as ZCode mode. Use it when you want a direct reading surface without the disguised workbench frame.
          </p>
          <button
            class="rounded-full bg-gem-blue px-5 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
            @click="openFilePicker"
          >
            Open EPUB
          </button>
        </div>
      </div>

      <div v-else class="min-h-0 flex-1">
        <EpubReader ref="epubReaderRef" :book-id="bookStore.currentBookId" min-height="100%" max-height="100%" />
      </div>
    </main>

    <TableOfContents
      :show="showTOC"
      :toc="toc"
      :book-title="currentBook?.title || ''"
      @close="showTOC = false"
      @navigate="navigateToChapter"
    />

    <BookmarkPanel
      :show="showBookmarks"
      :book-id="bookStore.currentBookId"
      @close="showBookmarks = false"
      @jump-to="jumpToCfi"
      @add-bookmark="addBookmark"
    />

    <FontSettings :show="showFontSettings" @close="showFontSettings = false" @apply="applyFontTheme" />
  </div>
</template>

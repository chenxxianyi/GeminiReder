<script setup>
import { computed } from 'vue';
import { useBookStore } from '../../stores/bookStore';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Menu,
  MoreHorizontal,
  FileText,
  Terminal,
  LayoutGrid,
  Settings,
  LayoutDashboard,
  ChevronDown
} from 'lucide-vue-next';

const props = defineProps({
  title: {
    type: String,
    default: 'No Task Selected'
  },
  projectName: {
    type: String,
    default: 'GeminiReader'
  },
  branchName: {
    type: String,
    default: 'main'
  }
});

const emit = defineEmits(['back', 'forward', 'toggle-sidebar', 'toggle-panel', 'open-toc', 'open-settings', 'switch-to-gemini']);

const bookStore = useBookStore();

const currentBookTitle = computed(() => {
  if (!bookStore.currentBookId) return 'No Task Selected';
  const book = bookStore.books.find(b => b.id === bookStore.currentBookId);
  return book?.fakeTitle || book?.title || 'Unknown Task';
});

const handleBack = () => {
  emit('back');
};

const handleForward = () => {
  emit('forward');
};

const handleToggleSidebar = () => {
  emit('toggle-sidebar');
};

const handleSwitchToGemini = () => {
  emit('switch-to-gemini');
};

const handleOpenTOC = () => {
  emit('open-toc');
};

const handleOpenSettings = () => {
  emit('open-settings');
};
</script>

<template>
  <header class="zcode-title-bar">
    <!-- Left: Menu items -->
    <div class="flex items-center h-full">
      <div class="zcode-title-bar-menu">
        <span class="font-semibold text-[var(--zc-accent)] mr-4">Z</span>
      </div>
      <div class="zcode-title-bar-menu">
        <span>File</span>
      </div>
      <div class="zcode-title-bar-menu">
        <span>Edit</span>
      </div>
      <div class="zcode-title-bar-menu">
        <span>Selection</span>
      </div>
      <div class="zcode-title-bar-menu">
        <span>View</span>
      </div>
      <div class="zcode-title-bar-menu">
        <span>Go</span>
      </div>
      <div class="zcode-title-bar-menu">
        <span>Run</span>
      </div>
      <div class="zcode-title-bar-menu">
        <span>Terminal</span>
      </div>
      <div class="zcode-title-bar-menu">
        <span>Help</span>
      </div>
    </div>

    <!-- Center: Title -->
    <div class="flex-1 flex items-center justify-center">
      <span class="text-[var(--zc-text-muted)] text-sm">{{ currentBookTitle }} — ZCode</span>
    </div>

    <!-- Right: Window controls -->
    <div class="flex items-center h-full">
      <button class="zcode-title-bar-menu !h-full !px-3">
        <span class="w-3 h-0.5 bg-[var(--zc-text-muted)] block"></span>
      </button>
      <button class="zcode-title-bar-menu !h-full !px-3">
        <span class="w-3 h-3 border border-[var(--zc-text-muted)] block"></span>
      </button>
      <button class="zcode-title-bar-menu !h-full !px-3 hover:!bg-[var(--zc-danger)] hover:!text-white">
        <span class="text-lg leading-none">×</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.zcode-title-bar {
  user-select: none;
}
</style>
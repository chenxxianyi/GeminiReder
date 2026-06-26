<script setup>
import { computed } from 'vue';
import { useBookStore } from '../../stores/bookStore';
import {
  ArrowLeft,
  ArrowRight,
  Folder,
  GitBranch,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  TerminalSquare,
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
  },
  commandOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['back', 'forward', 'toggle-sidebar', 'toggle-command', 'open-settings', 'switch-to-gemini']);

const bookStore = useBookStore();

const currentBookTitle = computed(() => {
  if (!bookStore.currentBookId) return props.title;
  const book = bookStore.books.find(b => b.id === bookStore.currentBookId);
  return book?.fakeTitle || book?.title || props.title;
});
</script>

<template>
  <header class="zcode-title-bar">
    <div class="zcode-window-brand">
      <div class="zcode-logo">Z</div>
      <button class="zcode-nav-btn" title="Back" @click="$emit('back')">
        <ArrowLeft :size="16" />
      </button>
      <button class="zcode-nav-btn" title="Forward" @click="$emit('forward')">
        <ArrowRight :size="16" />
      </button>
    </div>

    <div class="zcode-title-main">
      <div class="zcode-title-text">{{ currentBookTitle }}</div>

      <button class="zcode-pill zcode-project-pill" title="Project" @click="$emit('switch-to-gemini')">
        <Folder :size="14" />
        <span>{{ projectName }}</span>
      </button>

      <button class="zcode-pill" title="Branch">
        <GitBranch :size="14" />
        <span>{{ branchName }}</span>
        <ChevronDown :size="13" />
      </button>

      <button class="zcode-icon-only" title="More">
        <MoreHorizontal :size="18" />
      </button>
    </div>

    <div class="zcode-title-actions">
      <button class="zcode-title-tool active" title="Explorer" @click="$emit('toggle-sidebar')">
        <PanelLeft :size="16" />
      </button>
      <button class="zcode-title-tool" title="Command" :class="{ active: commandOpen }" @click="$emit('toggle-command')">
        <TerminalSquare :size="16" />
      </button>
      <button class="zcode-title-tool" title="Reading Settings" @click="$emit('open-settings')">
        <PanelRight :size="16" />
      </button>
      <button class="zcode-title-tool" title="Menu">
        <ChevronDown :size="18" />
      </button>
      <div class="zcode-window-control min"></div>
      <div class="zcode-window-control max"></div>
      <div class="zcode-window-control close"></div>
    </div>
  </header>
</template>

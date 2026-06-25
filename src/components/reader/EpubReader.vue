<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useBookStore } from '../../stores/bookStore';

/**
 * EpubReader Component
 * A pure EPUB rendering container that can be embedded in any shell.
 * It exposes the readerArea ref for useEpubReader to attach the rendition.
 */

const props = defineProps({
  bookId: {
    type: String,
    default: null
  },
  minHeight: {
    type: String,
    default: '360px'
  },
  maxHeight: {
    type: String,
    default: 'calc(100vh - 260px)'
  }
});

const emit = defineEmits(['ready', 'error', 'loaded']);

const bookStore = useBookStore();
const readerArea = ref(null);
const isLoading = ref(false);

// Expose readerArea for parent to use with useEpubReader
defineExpose({
  readerArea,
  isLoading
});

watch(() => props.bookId, async (newId, oldId) => {
  if (newId !== oldId) {
    emit('loaded', newId);
  }
});

onMounted(() => {
  emit('ready', readerArea.value);
});

onUnmounted(() => {
  // Clean up reader area
  if (readerArea.value) {
    readerArea.value.innerHTML = '';
  }
});
</script>

<template>
  <div class="epub-reader-container w-full h-full relative">
    <!-- Loading overlay -->
    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-gem-bg z-10"
    >
      <div class="flex flex-col items-center">
        <div class="w-8 h-8 border-2 border-gem-blue border-t-transparent rounded-full animate-spin mb-2"></div>
        <span class="text-gem-text-muted text-sm">Loading...</span>
      </div>
    </div>

    <!-- EPUB rendering area -->
    <div
      ref="readerArea"
      class="epub-render-area w-full h-full"
      :style="{
        minHeight: minHeight,
        maxHeight: maxHeight
      }"
    ></div>
  </div>
</template>

<style scoped>
.epub-reader-container {
  background-color: var(--gem-bg);
}

.epub-render-area {
  background-color: var(--gem-bg);
}
</style>

<style>
/* Global styles for epub.js container */
.epub-container {
  background-color: var(--gem-bg) !important;
  width: 100% !important;
}

.epub-view {
  width: 100% !important;
  margin: 0 !important;
}

.epub-container iframe {
  background-color: var(--gem-bg) !important;
  width: 100% !important;
}
</style>
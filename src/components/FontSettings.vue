<script setup>
import { ref, watch } from 'vue';
import { useBookStore } from '../stores/bookStore';
import { X, Type, Check } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['close', 'apply']);

const bookStore = useBookStore();

const availableFonts = [
  { name: 'Fira Code', value: 'Fira Code', category: 'monospace', preview: 'const readerState = syncProgress(taskId);' },
  { name: 'Consolas', value: 'Consolas', category: 'monospace', preview: 'const readerState = syncProgress(taskId);' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono', category: 'monospace', preview: 'const readerState = syncProgress(taskId);' },
  { name: 'Source Code Pro', value: 'Source Code Pro', category: 'monospace', preview: 'const readerState = syncProgress(taskId);' },
  { name: 'Noto Sans SC', value: 'Noto Sans SC', category: 'sans-serif', preview: '同步阅读任务状态与当前视图。' },
  { name: 'Roboto', value: 'Roboto', category: 'sans-serif', preview: 'const readerState = syncProgress(taskId);' },
  { name: 'Arial', value: 'Arial', category: 'sans-serif', preview: 'const readerState = syncProgress(taskId);' },
  { name: 'Georgia', value: 'Georgia', category: 'serif', preview: 'const readerState = syncProgress(taskId);' }
];

const fontSizes = [12, 13, 14, 15, 16, 17, 18, 20, 22, 24];

const selectedFont = ref(bookStore.fontFamily);
const selectedSize = ref(bookStore.fontSize);

watch(
  () => props.show,
  (show) => {
    if (!show) return;
    selectedFont.value = bookStore.fontFamily;
    selectedSize.value = bookStore.fontSize;
  }
);

const handleApply = () => {
  bookStore.setFontFamily(selectedFont.value);
  bookStore.setFontSize(selectedSize.value);
  emit('apply');
  emit('close');
};

const handleClose = () => {
  selectedFont.value = bookStore.fontFamily;
  selectedSize.value = bookStore.fontSize;
  emit('close');
};
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleClose"></div>

      <div class="relative w-full max-w-2xl overflow-hidden rounded-lg border border-gem-border bg-gem-surface shadow-2xl">
        <div class="flex items-center justify-between border-b border-gem-border px-6 py-4">
          <div class="flex items-center space-x-3">
            <Type :size="24" class="text-gem-blue" />
            <h2 class="text-xl font-medium text-gem-text-primary">Reader Theme</h2>
          </div>
          <button class="rounded-full p-2 transition-colors hover:bg-gem-hover" @click="handleClose">
            <X :size="20" class="text-gem-text-secondary" />
          </button>
        </div>

        <div class="max-h-[calc(80vh-140px)] overflow-y-auto p-6">
          <div class="mb-8">
            <h3 class="mb-4 text-sm font-medium text-gem-text-primary">Font size</h3>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="size in fontSizes"
                :key="size"
                class="relative rounded-lg border px-4 py-3 transition-all"
                :class="
                  selectedSize === size
                    ? 'border-gem-blue bg-gem-blue-bg text-gem-blue'
                    : 'border-gem-border bg-gem-sidebar text-gem-text-secondary hover:border-gem-text-muted'
                "
                @click="selectedSize = size"
              >
                <span class="text-sm font-medium">{{ size }}px</span>
                <Check v-if="selectedSize === size" :size="14" class="absolute top-1 right-1" />
              </button>
            </div>
          </div>

          <div>
            <h3 class="mb-4 text-sm font-medium text-gem-text-primary">Font stack</h3>
            <div class="space-y-2">
              <button
                v-for="font in availableFonts"
                :key="font.value"
                class="group relative w-full rounded-lg border px-4 py-4 text-left transition-all"
                :class="
                  selectedFont === font.value
                    ? 'border-gem-blue bg-gem-blue-bg'
                    : 'border-gem-border bg-gem-sidebar hover:border-gem-text-muted'
                "
                @click="selectedFont = font.value"
              >
                <div class="mb-2 flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <span
                      class="text-sm font-medium"
                      :class="selectedFont === font.value ? 'text-gem-blue' : 'text-gem-text-primary'"
                    >
                      {{ font.name }}
                    </span>
                    <span class="rounded bg-gem-border px-2 py-0.5 text-xs text-gem-text-muted">
                      {{ font.category }}
                    </span>
                  </div>
                  <Check v-if="selectedFont === font.value" :size="18" class="text-gem-blue" />
                </div>
                <div
                  class="text-sm text-gem-text-secondary"
                  :style="{ fontFamily: `'${font.value}', ${font.category}` }"
                >
                  {{ font.preview }}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3 border-t border-gem-border bg-gem-bg px-6 py-4">
          <button
            class="rounded-full px-5 py-2 text-sm font-medium text-gem-text-primary transition-colors hover:bg-gem-hover"
            @click="handleClose"
          >
            Cancel
          </button>
          <button
            class="rounded-full bg-gem-blue px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
            @click="handleApply"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>

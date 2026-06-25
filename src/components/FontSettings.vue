<script setup>
import { ref, computed } from 'vue';
import { useBookStore } from '../stores/bookStore';
import { X, Type, Check } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['close', 'apply']);

const bookStore = useBookStore();

// 可用字体列表
const availableFonts = [
  { name: 'Fira Code', value: 'Fira Code', category: 'monospace', preview: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Consolas', value: 'Consolas', category: 'monospace', preview: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Monaco', value: 'Monaco', category: 'monospace', preview: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Source Code Pro', value: 'Source Code Pro', category: 'monospace', preview: 'The quick brown fox jumps over the lazy dog' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono', category: 'monospace', preview: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Courier New', value: 'Courier New', category: 'monospace', preview: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Noto Sans SC', value: 'Noto Sans SC', category: 'sans-serif', preview: '快速的棕色狐狸跳过懒狗' },
  { name: 'Roboto', value: 'Roboto', category: 'sans-serif', preview: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Arial', value: 'Arial', category: 'sans-serif', preview: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Georgia', value: 'Georgia', category: 'serif', preview: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Times New Roman', value: 'Times New Roman', category: 'serif', preview: 'The quick brown fox jumps over the lazy dog' },
];

// 字体大小选项
const fontSizes = [12, 13, 14, 15, 16, 17, 18, 20, 22, 24];

const selectedFont = ref(bookStore.fontFamily);
const selectedSize = ref(bookStore.fontSize);

const handleApply = () => {
  bookStore.setFontFamily(selectedFont.value);
  bookStore.setFontSize(selectedSize.value);
  emit('apply');
  emit('close');
};

const handleClose = () => {
  // 恢复原始值
  selectedFont.value = bookStore.fontFamily;
  selectedSize.value = bookStore.fontSize;
  emit('close');
};
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- 背景遮罩 -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleClose"></div>
      
      <!-- 弹窗内容 -->
      <div class="relative bg-gem-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-gem-border">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gem-border">
          <div class="flex items-center space-x-3">
            <Type :size="24" class="text-gem-blue" />
            <h2 class="text-xl font-medium text-gem-text-primary">字体设置</h2>
          </div>
          <button @click="handleClose" class="p-2 hover:bg-gem-hover rounded-full transition-colors">
            <X :size="20" class="text-gem-text-secondary" />
          </button>
        </div>

        <!-- 内容区域 -->
        <div class="overflow-y-auto max-h-[calc(80vh-140px)] p-6">
          <!-- 字体大小 -->
          <div class="mb-8">
            <h3 class="text-sm font-medium text-gem-text-primary mb-4">字体大小</h3>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="size in fontSizes"
                :key="size"
                @click="selectedSize = size"
                class="px-4 py-3 rounded-lg border transition-all relative"
                :class="selectedSize === size 
                  ? 'bg-gem-blue-bg border-gem-blue text-gem-blue' 
                  : 'bg-gem-sidebar border-gem-border text-gem-text-secondary hover:border-gem-text-muted'"
              >
                <span class="text-sm font-medium">{{ size }}px</span>
                <Check v-if="selectedSize === size" :size="14" class="absolute top-1 right-1" />
              </button>
            </div>
          </div>

          <!-- 字体选择 -->
          <div>
            <h3 class="text-sm font-medium text-gem-text-primary mb-4">字体系列</h3>
            <div class="space-y-2">
              <button
                v-for="font in availableFonts"
                :key="font.value"
                @click="selectedFont = font.value"
                class="w-full px-4 py-4 rounded-lg border transition-all text-left relative group"
                :class="selectedFont === font.value 
                  ? 'bg-gem-blue-bg border-gem-blue' 
                  : 'bg-gem-sidebar border-gem-border hover:border-gem-text-muted'"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-sm font-medium" :class="selectedFont === font.value ? 'text-gem-blue' : 'text-gem-text-primary'">
                      {{ font.name }}
                    </span>
                    <span class="text-xs px-2 py-0.5 rounded bg-gem-border text-gem-text-muted">
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

        <!-- 底部按钮 -->
        <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gem-border bg-gem-bg">
          <button 
            @click="handleClose"
            class="px-5 py-2 rounded-full text-sm font-medium text-gem-text-primary hover:bg-gem-hover transition-colors"
          >
            取消
          </button>
          <button 
            @click="handleApply"
            class="px-5 py-2 rounded-full text-sm font-medium bg-gem-blue text-black hover:opacity-90 transition-opacity"
          >
            应用设置
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

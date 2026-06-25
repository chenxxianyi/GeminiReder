<script setup>
import { ref } from 'vue';
import { Plus, Sparkles, X } from 'lucide-vue-next';

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Type a command or search...'
  },
  isArticleMode: {
    type: Boolean,
    default: false
  },
  modelName: {
    type: String,
    default: 'CodeReader'
  }
});

const emit = defineEmits(['submit', 'toggle-article-mode']);

const inputValue = ref('');

const handleInputKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
};

const handleSubmit = () => {
  const content = inputValue.value.trim();
  if (!content) return;
  emit('submit', content);
  inputValue.value = '';
};
</script>

<template>
  <div class="zcode-terminal-panel">
    <!-- Terminal header -->
    <div class="zcode-terminal-header flex items-center justify-between px-4 py-2 border-b border-[var(--zc-border-soft)] bg-[var(--zc-tab-bg)]">
      <div class="flex items-center space-x-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-[var(--zc-text-muted)]">Terminal</span>
      </div>
      <div class="flex items-center space-x-1">
        <button class="zcode-btn !p-1" title="New Terminal">
          <Plus :size="14" />
        </button>
        <button class="zcode-btn !p-1" title="Split Terminal">
          <Sparkles :size="14" />
        </button>
        <button class="zcode-btn !p-1" title="Kill Terminal">
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Terminal content -->
    <div class="zcode-terminal-content p-2 bg-[var(--zc-bg)] font-mono text-sm h-24 overflow-y-auto zcode-scroll">
      <div class="text-[var(--zc-text-muted)]">
        <span class="text-green-400">→</span> Ready to read. Press arrow keys or click to navigate.
      </div>
      <div v-if="inputValue" class="text-[var(--zc-text)]">
        <span class="text-green-400">→</span> {{ inputValue }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.zcode-terminal-panel {
  height: 120px;
  background-color: var(--zc-bg);
  border-top: 1px solid var(--zc-border);
}

.zcode-terminal-header {
  height: 35px;
}

.zcode-terminal-content {
  height: calc(100% - 35px);
}

.zcode-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--zc-border) transparent;
}

.zcode-scroll::-webkit-scrollbar {
  width: 10px;
}

.zcode-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.zcode-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(121, 121, 121, 0.4);
}
</style>
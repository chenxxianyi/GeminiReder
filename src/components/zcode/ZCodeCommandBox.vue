<script setup>
import { ref } from 'vue';
import { Bot, ChevronDown, Circle, Plus, Send, SlidersHorizontal } from 'lucide-vue-next';

const props = defineProps({
  placeholder: {
    type: String,
    default: '继续输入以排队后续修改'
  },
  isArticleMode: {
    type: Boolean,
    default: false
  },
  modelName: {
    type: String,
    default: 'glm-5.2'
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
  <div class="zcode-command-wrap">
    <div class="zcode-command-box">
      <textarea
        v-model="inputValue"
        :placeholder="placeholder"
        class="zcode-command-input"
        rows="2"
        @keydown="handleInputKeydown"
      ></textarea>

      <div class="zcode-command-footer">
        <div class="zcode-command-left">
          <button class="zcode-command-btn" title="Add context" @click="$emit('toggle-article-mode')">
            <Plus :size="17" />
          </button>
          <button class="zcode-command-mode" :class="{ active: isArticleMode }" @click="$emit('toggle-article-mode')">
            <Bot :size="15" />
            <span>自动编辑</span>
            <ChevronDown :size="13" />
          </button>
        </div>

        <div class="zcode-command-right">
          <Circle :size="16" class="zcode-loader-dot" />
          <button class="zcode-command-mode">
            <span>{{ modelName }}</span>
            <ChevronDown :size="13" />
          </button>
          <button class="zcode-command-mode">
            <SlidersHorizontal :size="15" />
            <span>最高</span>
            <ChevronDown :size="13" />
          </button>
          <button class="zcode-send-btn" :class="{ ready: inputValue.trim() }" @click="handleSubmit" title="Send">
            <Send v-if="inputValue.trim()" :size="15" />
            <span v-else></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

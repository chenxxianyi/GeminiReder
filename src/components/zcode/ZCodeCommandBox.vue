<script setup>
import { ref } from 'vue';
import { Bot, ChevronDown, Folder, GitBranch, Plus, Send, ShieldCheck, SlidersHorizontal } from 'lucide-vue-next';

defineProps({
  placeholder: {
    type: String,
    default: '向 ZCode 提问，输入 @ 添加文件，/ 使用命令，$ 使用技能，# 关联对话'
  },
  isArticleMode: {
    type: Boolean,
    default: false
  },
  modelName: {
    type: String,
    default: 'glm-5.2'
  },
  projectName: {
    type: String,
    default: 'NoteWeb'
  },
  branchName: {
    type: String,
    default: 'master'
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
      <div class="zcode-command-context">
        <button class="zcode-command-context-btn" title="Project">
          <Folder :size="18" :stroke-width="1.7" />
          <span>{{ projectName }}</span>
          <ChevronDown :size="14" />
        </button>
        <button class="zcode-command-context-btn" title="Branch">
          <GitBranch :size="17" :stroke-width="1.7" />
          <span>{{ branchName }}</span>
          <ChevronDown :size="14" />
        </button>
      </div>

      <textarea
        v-model="inputValue"
        :placeholder="placeholder"
        class="zcode-command-input"
        rows="2"
        @keydown="handleInputKeydown"
      ></textarea>

      <div class="zcode-command-footer">
        <div class="zcode-command-left">
          <button class="zcode-command-btn" title="Toggle draft mode" @click="$emit('toggle-article-mode')">
            <Plus :size="17" />
          </button>
          <button class="zcode-command-mode" :class="{ active: isArticleMode }" @click="$emit('toggle-article-mode')">
            <ShieldCheck :size="18" :stroke-width="1.65" />
            <span>{{ isArticleMode ? '草稿追加' : '自动编辑' }}</span>
            <ChevronDown :size="13" />
          </button>
        </div>

        <div class="zcode-command-right">
          <button class="zcode-command-mode">
            <Bot :size="17" :stroke-width="1.7" />
            <span>{{ modelName }}</span>
            <ChevronDown :size="13" />
          </button>
          <button class="zcode-command-mode">
            <SlidersHorizontal :size="17" :stroke-width="1.7" />
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

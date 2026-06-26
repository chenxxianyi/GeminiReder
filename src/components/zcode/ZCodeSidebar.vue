<script setup>
import { computed } from 'vue';
import { useBookStore } from '../../stores/bookStore';
import {
  Folder,
  Layers3,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Wand2
} from 'lucide-vue-next';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  currentBookId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['select-book', 'new-task', 'open-search', 'toggle-collapsed', 'open-settings']);

const bookStore = useBookStore();

const recentTasks = computed(() => {
  const books = bookStore.books.map((book, index) => ({
    id: book.id,
    title: book.fakeTitle || book.title || `Reading Task ${index + 1}`,
    time: index === 0 ? '23分' : '1小时',
    active: book.id === props.currentBookId
  }));

  if (books.length > 0) return books;

  return [
    { id: 'placeholder-1', title: 'Repository Detail Page AI Tools Integration', time: '23分', active: true },
    { id: 'placeholder-2', title: '文件库AI工具功能开发', time: '1小时', active: false },
    { id: 'placeholder-3', title: 'Request Entity Too Large Error Fix', time: '1小时', active: false }
  ];
});

const selectTask = (task) => {
  if (task.id.startsWith('placeholder')) return;
  emit('select-book', task.id);
};
</script>

<template>
  <aside class="zcode-sidebar" :class="{ collapsed }">
    <div class="zcode-sidebar-header">
      <span>Explorer</span>
      <button class="zcode-mini-btn" title="More">
        <MoreHorizontal :size="14" />
      </button>
    </div>

    <div class="zcode-sidebar-top">
      <button class="zcode-sidebar-action" @click="$emit('new-task')">
        <Plus :size="16" />
        <span>新建任务</span>
        <kbd>Ctrl+N</kbd>
      </button>
      <button class="zcode-sidebar-action" @click="$emit('open-search')">
        <Search :size="16" />
        <span>搜索</span>
        <kbd>Ctrl+K</kbd>
      </button>
      <button class="zcode-sidebar-action" @click="$emit('open-settings', 'font')">
        <Wand2 :size="16" />
        <span>技能</span>
      </button>
    </div>

    <div class="zcode-sidebar-switcher">
      <button class="zcode-chip muted">
        <span>#</span>
        <span>分组</span>
      </button>
      <button class="zcode-chip active">
        <Folder :size="14" />
        <span>项目</span>
      </button>
      <button class="zcode-mini-btn" title="Collapse" @click="$emit('toggle-collapsed')">
        <Layers3 :size="14" />
      </button>
    </div>

    <div class="zcode-project-list zcode-scroll">
      <section class="zcode-project-block">
        <div class="zcode-project-name">
          <Folder :size="15" />
          <span>GeminiReder</span>
        </div>
        <div class="zcode-empty-text">暂无任务</div>
      </section>

      <section class="zcode-project-block">
        <div class="zcode-project-name">
          <Folder :size="15" />
          <span>NoteWeb</span>
        </div>

        <button
          v-for="task in recentTasks"
          :key="task.id"
          class="zcode-task-item"
          :class="{ active: task.active }"
          @click="selectTask(task)"
        >
          <Sparkles v-if="task.active" :size="14" class="zcode-task-spinner" />
          <span v-else class="zcode-task-dot"></span>
          <span class="zcode-task-title">{{ task.title }}</span>
          <span class="zcode-task-time">{{ task.time }}</span>
        </button>

        <button class="zcode-more-link">显示更多</button>
      </section>

      <section class="zcode-project-block">
        <div class="zcode-project-name">
          <Folder :size="15" />
          <span>ZCodeProject</span>
        </div>
        <div class="zcode-empty-text">暂无任务</div>
      </section>
    </div>

    <div class="zcode-sidebar-user">
      <div class="zcode-avatar">不</div>
      <div class="zcode-user-name">不吃番茄</div>
      <button class="zcode-mini-btn" title="Device">
        <span class="zcode-device-icon"></span>
      </button>
      <button class="zcode-mini-btn" title="Settings" @click="$emit('open-settings', 'font')">
        <Settings :size="15" />
      </button>
    </div>
  </aside>
</template>

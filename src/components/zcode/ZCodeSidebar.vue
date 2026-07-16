<script setup>
import { computed } from 'vue';
import { useBookStore } from '../../stores/bookStore';
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  Globe2,
  Folder,
  ListFilter,
  Maximize2,
  MessageCirclePlus,
  Search,
  Settings,
  Smartphone,
  Wand2
} from 'lucide-vue-next';
import zhipuIcon from '../../../zhipu.svg';

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

const emit = defineEmits([
  'select-book',
  'new-task',
  'back',
  'forward',
  'open-search',
  'open-browser',
  'toggle-collapsed',
  'open-settings'
]);

const bookStore = useBookStore();

const formatRelativeTime = (timestamp, index = 0) => {
  if (!timestamp) {
    return index === 0 ? '9分钟' : '1小时';
  }

  const diff = Date.now() - timestamp;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}分钟`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))}小时`;
  if (diff < 172_800_000) return '昨天';
  return `${Math.max(2, Math.floor(diff / 86_400_000))}天`;
};

const recentTasks = computed(() => {
  const books = [...bookStore.books]
    .sort((left, right) => (right.lastOpenedAt || right.addedAt || 0) - (left.lastOpenedAt || left.addedAt || 0))
    .map((book, index) => ({
      id: book.id,
      title: book.fakeTitle || book.title || `Reading Task ${index + 1}`,
      project: book.fakeProject || 'NoteWeb',
      type: book.fakeType || 'Review',
      time: formatRelativeTime(book.lastOpenedAt || book.addedAt, index),
      active: book.id === props.currentBookId
    }));

  if (books.length > 0) return books;

  return [
    { id: 'placeholder-hi', title: 'hi', project: 'NoteWeb', type: '', time: '2小时', active: false },
    { id: 'placeholder-reader', title: '/reader/11 缺失AI工具按钮', project: 'NoteWeb', type: '', time: '18小时', active: false },
    { id: 'placeholder-repo', title: 'Repository Detail Page AI', project: 'NoteWeb', type: '', time: '19小时', active: false, accent: true },
    { id: 'placeholder-library', title: '文件库AI工具功能开发', project: 'NoteWeb', type: '', time: '20小时', active: false, accent: true },
    { id: 'placeholder-large', title: 'Request Entity Too Large', project: 'NoteWeb', type: '', time: '20小时', active: false, accent: true }
  ];
});

const groupedTasks = computed(() => {
  return recentTasks.value.reduce((groups, task) => {
    if (!groups[task.project]) {
      groups[task.project] = [];
    }
    groups[task.project].push(task);
    return groups;
  }, {});
});

const projectNames = computed(() => Object.keys(groupedTasks.value));

const displaySections = computed(() => {
  const sections = projectNames.value.map((projectName) => ({
      name: projectName,
      tasks: groupedTasks.value[projectName],
      emptyText: ''
    }));

  ['GeminiReder', 'ZCodeProject'].forEach((name, index) => {
    if (!sections.some((section) => section.name === name)) {
      sections.splice(index === 0 ? 0 : sections.length, 0, {
        name,
        tasks: [],
        emptyText: '暂无任务'
      });
    }
  });

  return sections;
});

const selectTask = (task) => {
  if (task.id.startsWith('placeholder')) return;
  emit('select-book', task.id);
};
</script>

<template>
  <aside class="zcode-sidebar" :class="{ collapsed }">
    <div class="zcode-sidebar-windowbar" data-tauri-drag-region>
      <div class="zcode-logo-mark zcode-no-drag" title="Zhipu">
        <img :src="zhipuIcon" alt="Zhipu" />
      </div>
      <button class="zcode-nav-btn zcode-no-drag" title="Back" @click="$emit('back')">
        <ArrowLeft :size="19" />
      </button>
      <button class="zcode-nav-btn zcode-no-drag" title="Forward" @click="$emit('forward')">
        <ArrowRight :size="19" />
      </button>
    </div>

    <div class="zcode-sidebar-top">
      <button class="zcode-sidebar-action" @click="$emit('new-task')">
        <MessageCirclePlus :size="22" :stroke-width="1.75" />
        <span>新建任务</span>
        <kbd>Ctrl+N</kbd>
      </button>
      <button class="zcode-sidebar-action" @click="$emit('open-search')">
        <Search :size="22" :stroke-width="1.75" />
        <span>搜索</span>
        <kbd>Ctrl+K</kbd>
      </button>
      <button class="zcode-sidebar-action" title="打开网页" @click="$emit('open-browser')">
        <Globe2 :size="22" :stroke-width="1.75" />
        <span>浏览器</span>
        <kbd>Ctrl+L</kbd>
      </button>
      <button class="zcode-sidebar-action" @click="$emit('open-settings', 'font')">
        <Wand2 :size="22" :stroke-width="1.75" />
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
        <Maximize2 :size="14" />
      </button>
      <button class="zcode-mini-btn" title="Filter">
        <ListFilter :size="15" />
      </button>
      <button class="zcode-mini-btn" title="Archive">
        <Archive :size="15" />
      </button>
    </div>

    <div class="zcode-project-list zcode-scroll">
      <section v-for="section in displaySections" :key="section.name" class="zcode-project-block">
        <div class="zcode-project-name">
          <Folder :size="17" :stroke-width="1.7" />
          <span>{{ section.name }}</span>
        </div>

        <button
          v-for="task in section.tasks"
          :key="task.id"
          class="zcode-task-item"
          :class="{ active: task.active }"
          @click="selectTask(task)"
        >
          <span class="zcode-task-dot" :class="{ accent: task.accent || task.active, empty: !task.accent && !task.active }"></span>
          <div class="min-w-0">
            <span class="zcode-task-title">{{ task.title }}</span>
            <span class="zcode-task-type">{{ task.type }}</span>
          </div>
          <span class="zcode-task-time">{{ task.time }}</span>
        </button>
        <button v-if="section.name === 'NoteWeb' && section.tasks.length >= 4" class="zcode-more-link">显示更多</button>
        <div v-if="section.tasks.length === 0" class="zcode-empty-text">{{ section.emptyText }}</div>
      </section>
    </div>

    <div class="zcode-sidebar-scroll-indicator" aria-hidden="true">
      <span></span>
    </div>

    <div class="zcode-sidebar-user">
      <div class="zcode-avatar">
        <img :src="zhipuIcon" alt="" />
      </div>
      <div class="zcode-user-name">不吃番茄</div>
      <button class="zcode-mini-btn" title="Device">
        <Smartphone :size="16" />
      </button>
      <button class="zcode-mini-btn" title="Settings" @click="$emit('open-settings', 'font')">
        <Settings :size="15" />
      </button>
    </div>
  </aside>
</template>

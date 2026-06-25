<script setup>
import { computed } from 'vue';
import {
  Files,
  Search,
  GitBranch,
  Bug,
  Puzzle,
  Settings,
  User
} from 'lucide-vue-next';

const props = defineProps({
  activeItem: {
    type: String,
    default: 'explorer'
  }
});

const emit = defineEmits(['change-item']);

const activityItems = [
  { id: 'explorer', icon: Files, label: '资源管理器' },
  { id: 'search', icon: Search, label: '搜索' },
  { id: 'git', icon: GitBranch, label: '源代码管理' },
  { id: 'debug', icon: Bug, label: '运行和调试' },
  { id: 'extensions', icon: Puzzle, label: '扩展' }
];

const handleItemClick = (id) => {
  emit('change-item', id);
};
</script>

<template>
  <div class="zcode-activity-bar flex flex-col justify-between h-full bg-[var(--zc-activity-bar)]">
    <!-- Top section: Main activities -->
    <div class="flex flex-col">
      <button
        v-for="item in activityItems"
        :key="item.id"
        class="zcode-activity-item"
        :class="{ active: activeItem === item.id }"
        :title="item.label"
        @click="handleItemClick(item.id)"
      >
        <component :is="item.icon" :size="24" :stroke-width="1.25" />
      </button>
    </div>

    <!-- Bottom section: Settings & Account -->
    <div class="flex flex-col">
      <button
        class="zcode-activity-item"
        title="账户"
        @click="handleItemClick('account')"
      >
        <User :size="24" :stroke-width="1.25" />
      </button>
      <button
        class="zcode-activity-item"
        title="设置"
        @click="handleItemClick('settings')"
      >
        <Settings :size="24" :stroke-width="1.25" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.zcode-activity-bar {
  width: var(--zc-activity-bar-w, 48px);
  min-width: var(--zc-activity-bar-w, 48px);
}

.zcode-activity-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--zc-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
  transition: color 0.1s ease;
}

.zcode-activity-item:hover {
  color: var(--zc-text);
}

.zcode-activity-item.active {
  color: var(--zc-text);
}

.zcode-activity-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--zc-accent);
}
</style>
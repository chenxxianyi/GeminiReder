<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  ChevronDown,
  Folder,
  GitBranch,
  Minus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  Square,
  Terminal,
  X
} from 'lucide-vue-next';

defineProps({
  title: {
    type: String,
    default: 'No Task Selected'
  },
  projectName: {
    type: String,
    default: 'NoteWeb'
  },
  branchName: {
    type: String,
    default: 'main'
  },
  commandOpen: {
    type: Boolean,
    default: false
  },
  sidebarCollapsed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'back',
  'forward',
  'toggle-sidebar',
  'toggle-command',
  'open-settings',
  'open-toc',
  'open-progress',
  'open-bookmarks'
]);

const isTauriWindow = ref(false);
const tauriWindow = ref(null);
const isMaximized = ref(false);
let unlistenResized = null;

const runWindowAction = async (actionName, action) => {
  if (!tauriWindow.value) {
    console.warn(`[ZCode] Window action skipped outside Tauri: ${actionName}`);
    return;
  }

  try {
    await action(tauriWindow.value);
  } catch (error) {
    console.error(`[ZCode] Window action failed: ${actionName}`, error);
  }
};

const syncMaximizedState = async () => {
  await runWindowAction('isMaximized', async (currentWindow) => {
    isMaximized.value = await currentWindow.isMaximized();
  });
};

const minimizeWindow = async () => {
  await runWindowAction('minimize', async (currentWindow) => {
    await currentWindow.minimize();
  });
};

const toggleMaximizeWindow = async () => {
  await runWindowAction('toggleMaximize', async (currentWindow) => {
    await currentWindow.toggleMaximize();
  });
  await syncMaximizedState();
};

const closeWindow = async () => {
  await runWindowAction('close', async (currentWindow) => {
    await currentWindow.close();
  });
};

onMounted(async () => {
  isTauriWindow.value = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauriWindow.value) {
    tauriWindow.value = getCurrentWindow();
  }

  await syncMaximizedState();
  if (!tauriWindow.value) return;

  unlistenResized = await tauriWindow.value.onResized(async () => {
    await syncMaximizedState();
  });
});

onUnmounted(() => {
  if (unlistenResized) {
    unlistenResized();
    unlistenResized = null;
  }
});
</script>

<template>
  <header class="zcode-title-bar">
    <div class="zcode-title-left zcode-no-drag">
      <button
        class="zcode-title-tool zcode-title-sidebar-toggle"
        :title="sidebarCollapsed ? 'Show sidebar (Ctrl+Shift+L)' : 'Hide sidebar (Ctrl+Shift+L)'"
        @click="emit('toggle-sidebar')"
      >
        <PanelLeftOpen v-if="sidebarCollapsed" :size="20" :stroke-width="1.8" />
        <PanelLeftClose v-else :size="20" :stroke-width="1.8" />
      </button>
      <div class="zcode-title-name" :title="title">{{ title }}</div>
      <button class="zcode-title-pill" title="Project">
        <Folder :size="21" :stroke-width="1.85" />
        <span>{{ projectName }}</span>
      </button>
      <button class="zcode-title-pill" title="Branch">
        <GitBranch :size="21" :stroke-width="1.85" />
        <span>{{ branchName }}</span>
        <ChevronDown :size="17" :stroke-width="1.9" />
      </button>
      <button class="zcode-title-more" title="More">
        <MoreHorizontal :size="22" :stroke-width="2" />
      </button>
    </div>

    <div class="zcode-title-spacer" data-tauri-drag-region></div>
    <div class="zcode-title-actions zcode-no-drag">
      <button class="zcode-title-tool zcode-title-tool-raised" title="Project files" @click="emit('open-toc')">
        <Folder :size="20" :stroke-width="1.85" />
        <ChevronDown :size="14" :stroke-width="1.9" />
      </button>
      <button class="zcode-title-tool" title="Terminal" @click="emit('open-progress')">
        <Terminal :size="20" :stroke-width="1.75" />
      </button>
      <button class="zcode-title-tool" title="Panel">
        <PanelRight :size="20" :stroke-width="1.75" />
      </button>
      <button class="zcode-title-tool" title="Toggle command box" @click="emit('toggle-command')">
        <ChevronDown :size="21" :stroke-width="1.9" />
      </button>

      <button
        class="zcode-window-btn zcode-no-drag"
        :disabled="!isTauriWindow"
        title="Minimize"
        @click="minimizeWindow"
      >
        <Minus :size="19" :stroke-width="1.8" />
      </button>
      <button
        class="zcode-window-btn zcode-no-drag"
        :disabled="!isTauriWindow"
        :title="isMaximized ? 'Restore' : 'Maximize'"
        @click="toggleMaximizeWindow"
      >
        <Square :size="16" :stroke-width="1.8" />
      </button>
      <button
        class="zcode-window-btn zcode-window-btn-close zcode-no-drag"
        :disabled="!isTauriWindow"
        title="Close"
        @click="closeWindow"
      >
        <X :size="20" :stroke-width="1.65" />
      </button>
    </div>
  </header>
</template>

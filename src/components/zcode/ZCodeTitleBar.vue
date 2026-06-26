<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  ChevronDown,
  Minus,
  Square,
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
  }
});

const emit = defineEmits([
  'back',
  'forward',
  'toggle-sidebar',
  'toggle-command',
  'open-settings',
  'open-toc',
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
    <div class="zcode-title-spacer" data-tauri-drag-region></div>
    <div class="zcode-title-actions zcode-no-drag">
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

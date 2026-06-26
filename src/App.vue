<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import ZCodeShell from './components/zcode/ZCodeShell.vue';
import ClassicReaderShell from './components/ClassicReaderShell.vue';

const SHELL_STORAGE_KEY = 'shell_mode';
const shellMode = ref(localStorage.getItem(SHELL_STORAGE_KEY) || 'zcode');

const setShellMode = (mode) => {
  shellMode.value = mode;
  localStorage.setItem(SHELL_STORAGE_KEY, mode);
};

const toggleShellMode = () => {
  setShellMode(shellMode.value === 'zcode' ? 'classic' : 'zcode');
};

const handleGlobalKeydown = (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    toggleShellMode();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <ZCodeShell v-if="shellMode === 'zcode'" @switch-shell="toggleShellMode" />
  <ClassicReaderShell v-else @switch-shell="toggleShellMode" />
</template>

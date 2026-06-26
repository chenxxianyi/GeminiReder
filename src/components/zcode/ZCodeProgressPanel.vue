<script setup>
import { computed } from 'vue';
import { useBookStore } from '../../stores/bookStore';
import { ChevronRight, Plus, Terminal, Trash2, X } from 'lucide-vue-next';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  bookId: {
    type: String,
    default: null
  },
  projectName: {
    type: String,
    default: 'ZCodeProject'
  },
  branchName: {
    type: String,
    default: 'master'
  },
  status: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'add-record', 'jump-to', 'remove-record']);

const bookStore = useBookStore();

const records = computed(() => {
  if (!props.bookId) return [];
  return [...bookStore.getBookmarks(props.bookId)].sort((left, right) => right.createdAt - left.createdAt);
});

const formatTime = (timestamp) => {
  if (!timestamp) return '--:--';
  return new Date(timestamp).toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<template>
  <Transition name="zcode-terminal-pop">
    <section v-if="show" class="zcode-progress-panel zcode-no-drag" aria-label="Terminal">
      <header class="zcode-progress-head">
        <div class="zcode-progress-head-title">
          <Terminal :size="16" :stroke-width="1.8" />
          <span>TERMINAL</span>
          <span class="zcode-progress-muted">{{ projectName }}</span>
        </div>
        <button class="zcode-progress-icon-btn" title="Close" @click="emit('close')">
          <X :size="15" :stroke-width="1.9" />
        </button>
      </header>

      <div class="zcode-progress-bar">
        <button
          class="zcode-progress-capture"
          :disabled="!bookId"
          title="Capture current cursor"
          @click="emit('add-record')"
        >
          <Plus :size="15" :stroke-width="2" />
          <span>capture cursor</span>
        </button>
        <span class="zcode-progress-branch">{{ branchName }}</span>
      </div>

      <div class="zcode-progress-body zcode-scroll">
        <div class="zcode-progress-command">
          <span class="zcode-progress-prompt">$</span>
          <span>zcode trace --list --scope reader</span>
        </div>

        <div v-if="status" class="zcode-progress-status">
          <span class="zcode-progress-prompt">&gt;</span>
          <span>{{ status }}</span>
        </div>

        <div v-if="records.length === 0" class="zcode-progress-empty">
          <span class="zcode-progress-prompt">&gt;</span>
          <span>No cursor checkpoints in this workspace.</span>
        </div>

        <div v-else class="zcode-progress-records">
          <div v-for="record in records" :key="record.id" class="zcode-progress-record">
            <button class="zcode-progress-record-main" title="Open checkpoint" @click="emit('jump-to', record.cfi)">
              <ChevronRight :size="15" :stroke-width="1.9" />
              <span class="zcode-progress-record-copy">
                <span class="zcode-progress-record-label">{{ record.label }}</span>
                <span class="zcode-progress-record-meta">saved {{ formatTime(record.createdAt) }}</span>
              </span>
            </button>
            <button
              class="zcode-progress-record-remove"
              title="Drop checkpoint"
              @click.stop="emit('remove-record', record.id)"
            >
              <Trash2 :size="14" :stroke-width="1.8" />
            </button>
          </div>
        </div>
      </div>
    </section>
  </Transition>
</template>

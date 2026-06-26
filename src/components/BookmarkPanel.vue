<script setup>
import { ref, computed } from 'vue';
import { useBookStore } from '../stores/bookStore';
import { Bookmark, Trash2, Edit2, Check, X, Plus } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean,
  bookId: String
});

const emit = defineEmits(['close', 'jumpTo', 'addBookmark']);

const bookStore = useBookStore();
const editingId = ref(null);
const editingLabel = ref('');

const bookmarks = computed(() => {
  if (!props.bookId) return [];
  return bookStore.getBookmarks(props.bookId).sort((a, b) => b.createdAt - a.createdAt);
});

const handleJumpTo = (bookmark) => {
  emit('jumpTo', bookmark.cfi);
  emit('close');
};

const handleDelete = (bookmarkId) => {
  if (confirm('Delete this pin?')) {
    bookStore.removeBookmark(props.bookId, bookmarkId);
  }
};

const startEdit = (bookmark) => {
  editingId.value = bookmark.id;
  editingLabel.value = bookmark.label;
};

const saveEdit = (bookmarkId) => {
  if (editingLabel.value.trim()) {
    bookStore.updateBookmark(props.bookId, bookmarkId, editingLabel.value.trim());
  }
  editingId.value = null;
  editingLabel.value = '';
};

const cancelEdit = () => {
  editingId.value = null;
  editingLabel.value = '';
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const diff = Date.now() - timestamp;

  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<template>
  <Transition name="slide">
    <div
      v-if="show"
      class="fixed top-0 right-0 z-40 flex h-full w-80 flex-col border-l border-gem-border bg-gem-sidebar shadow-2xl"
    >
      <div class="flex items-center justify-between border-b border-gem-border px-4 py-3">
        <div class="flex items-center space-x-2">
          <Bookmark :size="20" class="text-gem-blue" />
          <h3 class="text-base font-medium text-gem-text-primary">Pins</h3>
          <span class="text-xs text-gem-text-muted">({{ bookmarks.length }})</span>
        </div>
        <button class="rounded-full p-1.5 transition-colors hover:bg-gem-hover" @click="emit('close')">
          <X :size="18" class="text-gem-text-secondary" />
        </button>
      </div>

      <div class="border-b border-gem-border px-4 py-3">
        <button
          class="flex w-full items-center justify-center space-x-2 rounded-lg bg-gem-blue px-4 py-2.5 font-medium text-black transition-opacity hover:opacity-90"
          @click="emit('addBookmark')"
        >
          <Plus :size="18" />
          <span class="text-sm">Add Pin</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div
          v-if="bookmarks.length === 0"
          class="flex h-full flex-col items-center justify-center px-4 text-center"
        >
          <Bookmark :size="48" class="mb-3 opacity-30 text-gem-text-muted" />
          <p class="mb-1 text-sm text-gem-text-secondary">No pins yet</p>
          <p class="text-xs text-gem-text-muted">Save a location to revisit it quickly.</p>
        </div>

        <div v-else class="space-y-2 p-3">
          <div
            v-for="bookmark in bookmarks"
            :key="bookmark.id"
            class="group rounded-lg border border-gem-border bg-gem-surface p-3 transition-all hover:border-gem-blue"
          >
            <div v-if="editingId === bookmark.id" class="space-y-2">
              <input
                v-model="editingLabel"
                type="text"
                autofocus
                class="w-full rounded border border-gem-blue bg-gem-bg px-2 py-1 text-sm text-gem-text-primary outline-none"
                @keyup.enter="saveEdit(bookmark.id)"
                @keyup.esc="cancelEdit"
              />
              <div class="flex items-center justify-end space-x-1">
                <button
                  class="rounded bg-gem-blue p-1.5 text-black transition-opacity hover:opacity-90"
                  @click="saveEdit(bookmark.id)"
                >
                  <Check :size="14" />
                </button>
                <button
                  class="rounded bg-gem-border p-1.5 text-gem-text-secondary transition-colors hover:bg-gem-hover"
                  @click="cancelEdit"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>

            <div v-else>
              <div class="mb-2 flex items-start justify-between">
                <button class="flex-1 text-left" @click="handleJumpTo(bookmark)">
                  <p class="text-sm font-medium text-gem-text-primary transition-colors hover:text-gem-blue">
                    {{ bookmark.label }}
                  </p>
                </button>
                <div class="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    class="rounded p-1.5 transition-colors hover:bg-gem-hover"
                    title="Rename pin"
                    @click="startEdit(bookmark)"
                  >
                    <Edit2 :size="14" class="text-gem-text-muted" />
                  </button>
                  <button
                    class="rounded p-1.5 transition-colors hover:bg-red-500/20"
                    title="Delete pin"
                    @click="handleDelete(bookmark.id)"
                  >
                    <Trash2 :size="14" class="text-red-400" />
                  </button>
                </div>
              </div>
              <p class="text-xs text-gem-text-muted">{{ formatDate(bookmark.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>

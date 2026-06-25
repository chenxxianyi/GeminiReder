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
  if (confirm('确定要删除这个书签吗？')) {
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

const handleAddBookmark = () => {
  emit('addBookmark');
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚';
  }
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  }
  // 小于1天
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  }
  // 小于7天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)} 天前`;
  }
  
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<template>
  <Transition name="slide">
    <div v-if="show" class="fixed top-0 right-0 h-full w-80 bg-gem-sidebar border-l border-gem-border shadow-2xl z-40 flex flex-col">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gem-border">
        <div class="flex items-center space-x-2">
          <Bookmark :size="20" class="text-gem-blue" />
          <h3 class="text-base font-medium text-gem-text-primary">书签</h3>
          <span class="text-xs text-gem-text-muted">({{ bookmarks.length }})</span>
        </div>
        <button @click="emit('close')" class="p-1.5 hover:bg-gem-hover rounded-full transition-colors">
          <X :size="18" class="text-gem-text-secondary" />
        </button>
      </div>

      <!-- 添加书签按钮 -->
      <div class="px-4 py-3 border-b border-gem-border">
        <button
          @click="handleAddBookmark"
          class="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gem-blue hover:opacity-90 text-black rounded-lg transition-opacity font-medium"
        >
          <Plus :size="18" />
          <span class="text-sm">添加书签</span>
        </button>
      </div>

      <!-- 书签列表 -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="bookmarks.length === 0" class="flex flex-col items-center justify-center h-full text-center px-4">
          <Bookmark :size="48" class="text-gem-text-muted mb-3 opacity-30" />
          <p class="text-gem-text-secondary text-sm mb-1">还没有书签</p>
          <p class="text-gem-text-muted text-xs">点击上方按钮添加书签</p>
        </div>

        <div v-else class="p-3 space-y-2">
          <div
            v-for="bookmark in bookmarks"
            :key="bookmark.id"
            class="bg-gem-surface rounded-lg p-3 border border-gem-border hover:border-gem-blue transition-all group"
          >
            <!-- 编辑模式 -->
            <div v-if="editingId === bookmark.id" class="space-y-2">
              <input
                v-model="editingLabel"
                type="text"
                class="w-full bg-gem-bg border border-gem-blue rounded px-2 py-1 text-sm text-gem-text-primary outline-none"
                @keyup.enter="saveEdit(bookmark.id)"
                @keyup.esc="cancelEdit"
                autofocus
              />
              <div class="flex items-center justify-end space-x-1">
                <button
                  @click="saveEdit(bookmark.id)"
                  class="p-1.5 bg-gem-blue text-black rounded hover:opacity-90 transition-opacity"
                >
                  <Check :size="14" />
                </button>
                <button
                  @click="cancelEdit"
                  class="p-1.5 bg-gem-border text-gem-text-secondary rounded hover:bg-gem-hover transition-colors"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>

            <!-- 显示模式 -->
            <div v-else>
              <div class="flex items-start justify-between mb-2">
                <button
                  @click="handleJumpTo(bookmark)"
                  class="flex-1 text-left"
                >
                  <p class="text-sm text-gem-text-primary font-medium hover:text-gem-blue transition-colors">
                    {{ bookmark.label }}
                  </p>
                </button>
                <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    @click="startEdit(bookmark)"
                    class="p-1.5 hover:bg-gem-hover rounded transition-colors"
                    title="编辑"
                  >
                    <Edit2 :size="14" class="text-gem-text-muted" />
                  </button>
                  <button
                    @click="handleDelete(bookmark.id)"
                    class="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 :size="14" class="text-red-400" />
                  </button>
                </div>
              </div>
              <p class="text-xs text-gem-text-muted">
                {{ formatDate(bookmark.createdAt) }}
              </p>
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

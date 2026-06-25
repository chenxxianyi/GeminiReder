<script setup>
import { ref, onMounted } from 'vue';
import { useBookStore } from '../stores/bookStore';
import { X, Trash2, BookOpen } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['close', 'selectBook']);

const bookStore = useBookStore();
const bookCovers = ref({});

// 加载所有书籍封面
const loadCovers = async () => {
  for (const book of bookStore.books) {
    if (book.hasCover) {
      const coverUrl = await bookStore.getCover(book.id);
      if (coverUrl) {
        bookCovers.value[book.id] = coverUrl;
      }
    }
  }
};

onMounted(() => {
  loadCovers();
});

const handleSelectBook = (bookId) => {
  emit('selectBook', bookId);
  emit('close');
};

const handleDeleteBook = async (bookId, event) => {
  event.stopPropagation();
  if (confirm('确定要删除这本书吗？')) {
    await bookStore.removeBook(bookId);
    // 清理封面 URL
    if (bookCovers.value[bookId]) {
      URL.revokeObjectURL(bookCovers.value[bookId]);
      delete bookCovers.value[bookId];
    }
  }
};

const handleClose = () => {
  emit('close');
};

// 获取书籍首字母用于默认封面
const getInitial = (title) => {
  if (!title) return '?';
  const firstChar = title.trim()[0].toUpperCase();
  return /[A-Z]/.test(firstChar) ? firstChar : title.trim()[0];
};

// 生成渐变色
const getGradient = (id) => {
  const gradients = [
    'from-blue-500 to-purple-600',
    'from-purple-500 to-pink-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-indigo-500 to-blue-600',
    'from-pink-500 to-rose-600',
    'from-teal-500 to-cyan-600',
    'from-yellow-500 to-orange-600',
  ];
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
};
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- 背景遮罩 -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleClose"></div>
      
      <!-- 弹窗内容 -->
      <div class="relative bg-[#1e1f20] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-[#444746]">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-[#444746]">
          <div class="flex items-center space-x-3">
            <BookOpen :size="24" class="text-gem-blue" />
            <h2 class="text-xl font-medium text-white">我的书库</h2>
            <span class="text-sm text-gem-text-muted">共 {{ bookStore.books.length }} 本</span>
          </div>
          <button @click="handleClose" class="p-2 hover:bg-[#333537] rounded-full transition-colors">
            <X :size="20" class="text-gem-text-secondary" />
          </button>
        </div>

        <!-- 书籍网格 -->
        <div class="overflow-y-auto max-h-[calc(85vh-80px)] p-6">
          <div v-if="bookStore.books.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen :size="64" class="text-gem-text-muted mb-4 opacity-30" />
            <p class="text-gem-text-secondary text-lg mb-2">书库是空的</p>
            <p class="text-gem-text-muted text-sm">点击"新对话"按钮上传你的第一本书</p>
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div
              v-for="book in bookStore.books"
              :key="book.id"
              @click="handleSelectBook(book.id)"
              class="group relative cursor-pointer"
            >
              <!-- 书籍卡片 -->
              <div class="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#2d2e2f] border border-[#444746] hover:border-gem-blue transition-all duration-200 hover:scale-105 hover:shadow-xl">
                <!-- 封面图片或默认封面 -->
                <div v-if="bookCovers[book.id]" class="w-full h-full">
                  <img 
                    :src="bookCovers[book.id]" 
                    :alt="book.title"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div v-else :class="['w-full h-full flex items-center justify-center bg-gradient-to-br', getGradient(book.id)]">
                  <span class="text-6xl font-bold text-white opacity-90">{{ getInitial(book.title) }}</span>
                </div>

                <!-- 悬停遮罩 -->
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    @click="handleDeleteBook(book.id, $event)"
                    class="p-3 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
                  >
                    <Trash2 :size="20" class="text-white" />
                  </button>
                </div>

                <!-- 当前阅读标记 -->
                <div v-if="bookStore.currentBookId === book.id" class="absolute top-2 right-2 px-2 py-1 bg-gem-blue text-black text-xs font-medium rounded">
                  阅读中
                </div>
              </div>

              <!-- 书籍信息 -->
              <div class="mt-2 px-1">
                <h3 class="text-sm font-medium text-gem-text-primary truncate" :title="book.title">
                  {{ book.title }}
                </h3>
                <p class="text-xs text-gem-text-muted truncate mt-0.5" :title="book.author">
                  {{ book.author }}
                </p>
                <p class="text-xs text-gem-text-muted mt-0.5">
                  {{ formatDate(book.addedAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>

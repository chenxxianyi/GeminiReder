<script setup>
import { ref, onMounted } from 'vue';
import { useBookStore } from '../stores/bookStore';
import { Trash2 } from 'lucide-vue-next';

const props = defineProps({
  book: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['click', 'delete']);

const bookStore = useBookStore();
const coverUrl = ref(null);

onMounted(async () => {
  if (props.book.hasCover) {
    coverUrl.value = await bookStore.getCover(props.book.id);
  }
});
</script>

<template>
  <div 
    class="bg-gem-card-bg border border-gem-border rounded-xl overflow-hidden hover:border-gem-blue transition-all group relative flex flex-col h-[280px] cursor-pointer"
    @click="emit('click', book.id)"
  >
    <!-- Cover Image or Placeholder -->
    <div class="h-48 w-full bg-gem-surface relative overflow-hidden flex items-center justify-center">
      <img 
        v-if="coverUrl" 
        :src="coverUrl" 
        alt="Book Cover" 
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div 
        v-else 
        class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-5xl"
      >
        {{ (book.title || book.fakeTitle || 'U').charAt(0).toUpperCase() }}
      </div>
      
      <!-- Hover Overlay -->
      <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>

      <!-- Delete Button (Top Right) -->
      <button 
        @click.stop="emit('delete', book.id)" 
        class="absolute top-2 right-2 p-2 bg-black bg-opacity-50 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="删除书籍"
      >
        <Trash2 :size="16" />
      </button>
    </div>
    
    <!-- Book Info -->
    <div class="p-3 flex-1 flex flex-col">
      <h4 class="text-gem-text-primary font-medium text-sm line-clamp-2 mb-1" :title="book.title || book.fakeTitle">
        {{ book.title || book.fakeTitle }}
      </h4>
      <p class="text-xs text-gem-text-muted mb-2 line-clamp-1">
        {{ book.author || 'Unknown Author' }}
      </p>
      
      <div class="mt-auto pt-2 border-t border-gem-border flex justify-between items-center text-xs text-gem-text-muted">
        <span>{{ new Date(book.addedAt).toLocaleDateString() }}</span>
        <span class="text-gem-blue opacity-0 group-hover:opacity-100 transition-opacity">阅读</span>
      </div>
    </div>
  </div>
</template>
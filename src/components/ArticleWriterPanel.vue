<script setup>
import { computed } from 'vue';
import { X, FileText, Plus, Trash2, Save } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean,
  articles: {
    type: Array,
    default: () => []
  },
  activeArticleId: {
    type: String,
    default: null
  },
  saveMessage: {
    type: String,
    default: ''
  }
});

const emit = defineEmits([
  'close',
  'create',
  'select',
  'delete',
  'updateTitle',
  'updateContent',
  'save'
]);

const sortedArticles = computed(() => {
  return [...props.articles].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
});

const activeArticle = computed(() => {
  return props.articles.find(article => article.id === props.activeArticleId) || null;
});

const wordCount = computed(() => {
  if (!activeArticle.value || !activeArticle.value.content) {
    return 0;
  }
  const text = activeArticle.value.content.trim();
  return text ? text.split(/\s+/).length : 0;
});

const formatDate = (timestamp) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const handleDelete = (article) => {
  if (confirm(`Delete article "${article.title}"?`)) {
    emit('delete', article.id);
  }
};

const handleSave = () => {
  if (activeArticle.value) {
    emit('save', activeArticle.value.id);
  }
};

const handleEditorKeydown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    handleSave();
  }
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-50 bg-black/50 p-3 md:p-8"
      @click.self="emit('close')"
    >
      <div class="h-full w-full bg-gem-sidebar border border-gem-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div class="h-14 px-4 md:px-6 border-b border-gem-border flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <FileText :size="18" class="text-gem-blue" />
            <span class="text-gem-text-primary font-medium">Article Writer</span>
          </div>
          <button
            @click="emit('close')"
            class="p-2 rounded-full text-gem-text-secondary hover:bg-gem-hover transition-colors"
          >
            <X :size="18" />
          </button>
        </div>

        <div class="flex-1 min-h-0 flex flex-col md:flex-row">
          <aside class="w-full md:w-80 md:flex-shrink-0 border-b md:border-b-0 md:border-r border-gem-border flex flex-col">
            <div class="p-4 border-b border-gem-border">
              <button
                @click="emit('create')"
                class="w-full py-2.5 rounded-lg bg-gem-blue text-black font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity"
              >
                <Plus :size="16" />
                <span>New Article</span>
              </button>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              <button
                v-for="article in sortedArticles"
                :key="article.id"
                class="w-full rounded-lg border p-3 text-left transition-colors"
                :class="article.id === activeArticleId ? 'border-gem-blue bg-gem-surface' : 'border-gem-border hover:border-gem-blue/60'"
                @click="emit('select', article.id)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gem-text-primary truncate">{{ article.title }}</p>
                    <p class="text-xs text-gem-text-muted mt-1">{{ formatDate(article.updatedAt) }}</p>
                  </div>
                  <div class="flex items-center space-x-1 flex-shrink-0">
                    <span
                      v-if="article.dirty"
                      class="inline-block w-2 h-2 rounded-full bg-amber-400"
                      title="Unsaved changes"
                    ></span>
                    <button
                      @click.stop="handleDelete(article)"
                      class="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>
              </button>

              <div v-if="sortedArticles.length === 0" class="text-center text-gem-text-muted text-sm py-10">
                No articles yet.
              </div>
            </div>
          </aside>

          <section class="flex-1 min-h-0 flex flex-col">
            <div v-if="activeArticle" class="flex-1 min-h-0 flex flex-col">
              <div class="p-4 md:p-6 border-b border-gem-border">
                <input
                  :value="activeArticle.title"
                  class="w-full bg-gem-bg border border-gem-border rounded-lg px-3 py-2 text-base text-gem-text-primary outline-none focus:border-gem-blue"
                  placeholder="Article title"
                  @input="emit('updateTitle', { id: activeArticle.id, title: $event.target.value })"
                  @keydown="handleEditorKeydown"
                />
              </div>

              <div class="flex-1 min-h-0 p-4 md:p-6">
                <textarea
                  :value="activeArticle.content"
                  class="w-full h-full resize-none bg-gem-bg border border-gem-border rounded-lg px-3 py-3 text-sm text-gem-text-primary outline-none focus:border-gem-blue leading-relaxed"
                  placeholder="Write your article here..."
                  @input="emit('updateContent', { id: activeArticle.id, content: $event.target.value })"
                  @keydown="handleEditorKeydown"
                ></textarea>
              </div>

              <div class="h-14 px-4 md:px-6 border-t border-gem-border flex items-center justify-between">
                <div class="flex items-center space-x-3 text-xs text-gem-text-muted">
                  <span>{{ wordCount }} words</span>
                  <span>{{ activeArticle.content?.length || 0 }} chars</span>
                  <span v-if="saveMessage" class="text-gem-blue">{{ saveMessage }}</span>
                </div>
                <button
                  @click="handleSave"
                  class="px-4 py-2 rounded-lg bg-gem-blue text-black font-medium flex items-center space-x-2 hover:opacity-90 transition-opacity"
                >
                  <Save :size="16" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            <div v-else class="h-full flex items-center justify-center text-gem-text-muted">
              <div class="text-center px-6">
                <p class="text-base mb-3">No active article</p>
                <button
                  @click="emit('create')"
                  class="px-4 py-2 rounded-lg bg-gem-blue text-black font-medium hover:opacity-90 transition-opacity"
                >
                  Create one
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

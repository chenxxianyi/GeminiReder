<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useBookStore } from '../../stores/bookStore';

const props = defineProps({
  readerArea: {
    type: Object,
    default: null
  },
  showBossMode: {
    type: Boolean,
    default: false
  },
  showArticleCanvas: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle-boss-mode', 'toggle-article-canvas']);

const bookStore = useBookStore();

// Current article content
const currentArticleContent = computed(() => {
  if (!bookStore.currentArticleId) return '';
  const article = bookStore.getArticleById(bookStore.currentArticleId);
  return article?.content || '';
});

// Handle article content input
const handleArticleInput = (event) => {
  const content = event.target.innerText;
  if (bookStore.currentArticleId) {
    bookStore.updateArticle(bookStore.currentArticleId, { content });
  }
};

// Toggle boss mode
const handleToggleBossMode = () => {
  emit('toggle-boss-mode');
};

// Toggle article canvas
const handleToggleArticleCanvas = () => {
  emit('toggle-article-canvas');
};
</script>

<template>
  <div class="zcode-reader-surface flex-1 overflow-hidden bg-[var(--zc-editor-bg)]">
    <!-- Boss Mode Content -->
    <div v-show="showBossMode" class="h-full overflow-y-auto zcode-scroll p-8">
      <div class="max-w-4xl mx-auto">
        <!-- Fake VSCode editor content -->
        <div class="font-mono text-sm">
          <div class="text-[var(--zc-text-muted)] mb-4">// 分析 Kubernetes 集群日志中的异常 pod 重启问题</div>
          <div class="text-green-400 mb-2"># Check pod memory usage</div>
          <div><span class="text-purple-400">def</span> <span class="text-yellow-400">analyze_memory_usage</span>(pod_name, namespace):</div>
          <div class="pl-4 text-[var(--zc-text-muted)]">metrics = client.CustomObjectsApi().list_namespaced_custom_object(</div>
          <div class="pl-8 text-[var(--zc-text-muted)]"><span class="text-orange-400">"metrics.k8s.io"</span>, <span class="text-orange-400">"v1beta1"</span>, namespace, <span class="text-orange-400">"pods"</span></div>
          <div class="pl-4 text-[var(--zc-text-muted)]">)</div>
          <div class="pl-4"><span class="text-purple-400">for</span> item <span class="text-purple-400">in</span> metrics[<span class="text-orange-400">'items'</span>]:</div>
          <div class="pl-8"><span class="text-purple-400">if</span> item[<span class="text-orange-400">'metadata'</span>][<span class="text-orange-400">'name'</span>] == pod_name:</div>
          <div class="pl-12 text-[var(--zc-text-muted)]">usage = item[<span class="text-orange-400">'containers'</span>][0][<span class="text-orange-400">'usage'</span>][<span class="text-orange-400">'memory'</span>]</div>
          <div class="pl-12"><span class="text-purple-400">return</span> <span class="text-blue-400">int</span>(usage.rstrip(<span class="text-orange-400">'Ki'</span>))</div>
          <div class="pl-4"><span class="text-purple-400">return</span> <span class="text-blue-400">None</span></div>
        </div>
      </div>
    </div>

    <!-- Article Canvas Content -->
    <div v-show="!showBossMode && showArticleCanvas" class="h-full overflow-y-auto zcode-scroll p-8">
      <div class="max-w-4xl mx-auto">
        <div
          class="text-[var(--zc-text)] text-sm leading-relaxed outline-none focus:ring-1 focus:ring-[var(--zc-accent)] rounded p-2 whitespace-pre-wrap font-mono"
          contenteditable="true"
          @input="handleArticleInput"
          spellcheck="false"
        >
          {{ currentArticleContent || '// Start typing your article here...' }}
        </div>
      </div>
    </div>

    <!-- EPUB Reader Content -->
    <div v-show="!showBossMode && !showArticleCanvas" class="h-full w-full">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.zcode-reader-surface {
  background-color: var(--zc-editor-bg);
}

.zcode-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--zc-border) transparent;
}

.zcode-scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.zcode-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.zcode-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(121, 121, 121, 0.4);
}

.zcode-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(121, 121, 121, 0.7);
}
</style>
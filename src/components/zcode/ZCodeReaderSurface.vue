<script setup>
import { computed, ref, watch } from 'vue';
import { useBookStore } from '../../stores/bookStore';
import {
  Copy,
  EyeOff,
  Maximize2,
  RotateCcw,
  ThumbsDown,
  ThumbsUp
} from 'lucide-vue-next';

const props = defineProps({
  showBossMode: {
    type: Boolean,
    default: false
  },
  showArticleCanvas: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle-boss-mode', 'toggle-article-canvas', 'refresh-reader']);

const bookStore = useBookStore();
const feedbackState = ref('');

const currentArticleContent = computed(() => {
  if (!bookStore.currentArticleId) return '';
  return bookStore.getArticleById(bookStore.currentArticleId)?.content || '';
});

const currentBook = computed(() => {
  if (!bookStore.currentBookId) return null;
  return bookStore.books.find((book) => book.id === bookStore.currentBookId) || null;
});

const readerLabel = computed(() => {
  return currentBook.value?.title || currentBook.value?.fakeTitle || 'ZCode 阅读任务';
});

const handleArticleInput = (event) => {
  if (!bookStore.currentArticleId) return;
  bookStore.updateArticle(bookStore.currentArticleId, {
    content: event.target.innerText
  });
};

const copyReaderInfo = async () => {
  const book = currentBook.value;
  if (!book) return;

  const text = [book.title, book.author].filter(Boolean).join(' - ');
  try {
    await navigator.clipboard?.writeText(text || readerLabel.value);
  } catch (error) {
    console.warn('[ZCode] Copy reader info failed:', error);
  }
};

const toggleFullscreen = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.querySelector('.zcode-reader-surface')?.requestFullscreen();
  } catch (error) {
    console.warn('[ZCode] Toggle reader fullscreen failed:', error);
  }
};

watch(
  () => bookStore.currentBookId,
  () => {
    feedbackState.value = '';
  }
);
</script>

<template>
  <div class="zcode-reader-surface flex-1 overflow-hidden bg-[var(--zc-editor-bg)]">
    <div v-show="showBossMode" class="h-full overflow-y-auto zcode-scroll p-8">
      <div class="mx-auto max-w-5xl">
        <div class="mb-6 flex items-center justify-between border-b border-[var(--zc-border-soft)] pb-4">
          <div>
            <div class="text-xs uppercase tracking-[0.08em] text-[var(--zc-text-dim)]">Focus Shield</div>
            <div class="mt-1 text-sm text-[var(--zc-text)]">Incident review workspace</div>
          </div>
          <button class="zcode-btn zcode-btn-accent" @click="emit('toggle-boss-mode')">
            <EyeOff :size="16" class="mr-1" />
            Resume Task
          </button>
        </div>

        <div class="rounded-md border border-[var(--zc-border-soft)] bg-[#0d0d0d] p-6 font-mono text-sm">
          <div class="mb-3 text-[var(--zc-text-dim)]">// deployment anomaly review</div>
          <div class="mb-2 text-green-400"># inspect pod restart pattern</div>
          <div><span class="text-purple-400">const</span> restartWindow = <span class="text-orange-400">'15m'</span>;</div>
          <div><span class="text-purple-400">const</span> maxMemory = <span class="text-blue-400">512</span>;</div>
          <div class="mt-3"><span class="text-purple-400">function</span> <span class="text-yellow-300">analyzeRestartBudget</span>(pods) {</div>
          <div class="pl-6">return pods</div>
          <div class="pl-10">.filter((pod) =&gt; pod.restartCount &gt; <span class="text-blue-400">3</span>)</div>
          <div class="pl-10">.map((pod) =&gt; ({</div>
          <div class="pl-14">name: pod.name,</div>
          <div class="pl-14">reason: pod.lastState?.terminated?.reason ?? <span class="text-orange-400">'Unknown'</span>,</div>
          <div class="pl-14">memoryMi: Math.round(pod.memoryBytes / <span class="text-blue-400">1024</span> / <span class="text-blue-400">1024</span>)</div>
          <div class="pl-10">}));</div>
          <div>}</div>

          <div class="mt-5 rounded border border-[var(--zc-border-soft)] bg-[#151515] p-4 text-[var(--zc-text-muted)]">
            Action items:
            <div class="mt-2">1. Raise memory limit from 256Mi to 512Mi.</div>
            <div>2. Add retry backoff metrics to dashboard panel.</div>
            <div>3. Re-run stress profile after rollout.</div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="!showBossMode && showArticleCanvas" class="h-full overflow-y-auto zcode-scroll p-8">
      <div class="mx-auto max-w-5xl">
        <div
          class="min-h-[360px] whitespace-pre-wrap rounded-md border border-[var(--zc-border-soft)] bg-[#0d0d0d] p-4 font-mono text-sm leading-7 text-[var(--zc-text)] outline-none focus:ring-1 focus:ring-[var(--zc-accent)]"
          contenteditable="true"
          spellcheck="false"
          @input="handleArticleInput"
        >
          {{ currentArticleContent || '// Draft notes will appear here. Use the command box to append blocks.' }}
        </div>
      </div>
    </div>

    <div
      v-show="!showBossMode && !showArticleCanvas && !bookStore.currentBookId"
      class="zcode-empty-home"
    >
      <div class="zcode-watermark" aria-hidden="true">
        <span class="zcode-watermark-wing"></span>
        <span class="zcode-watermark-stem"></span>
      </div>
      <h1 class="zcode-greeting">上午好呀，有什么想让我帮忙的吗</h1>
    </div>

    <div
      v-show="!showBossMode && !showArticleCanvas && bookStore.currentBookId"
      class="zcode-reader-workspace zcode-scroll"
    >
      <section class="zcode-reader-thread" :aria-label="readerLabel">
        <div class="zcode-reader-book-frame">
          <slot></slot>
        </div>

        <div class="zcode-reader-actions" aria-label="阅读操作">
          <button class="zcode-reader-action-btn" title="复制书籍信息" @click="copyReaderInfo">
            <Copy :size="18" :stroke-width="1.8" />
          </button>
          <button
            class="zcode-reader-action-btn"
            :class="{ active: feedbackState === 'up' }"
            :aria-pressed="feedbackState === 'up'"
            title="有帮助"
            @click="feedbackState = feedbackState === 'up' ? '' : 'up'"
          >
            <ThumbsUp :size="18" :stroke-width="1.8" />
          </button>
          <button
            class="zcode-reader-action-btn"
            :class="{ active: feedbackState === 'down' }"
            :aria-pressed="feedbackState === 'down'"
            title="无帮助"
            @click="feedbackState = feedbackState === 'down' ? '' : 'down'"
          >
            <ThumbsDown :size="18" :stroke-width="1.8" />
          </button>
          <button class="zcode-reader-action-btn" title="重新加载阅读页" @click="emit('refresh-reader')">
            <RotateCcw :size="18" :stroke-width="1.8" />
          </button>
          <button class="zcode-reader-action-btn" title="全屏阅读" @click="toggleFullscreen">
            <Maximize2 :size="18" :stroke-width="1.8" />
          </button>
        </div>
      </section>
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

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { listen } from '@tauri-apps/api/event';
import { Webview } from '@tauri-apps/api/webview';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe2,
  Loader2,
  LockKeyhole,
  RefreshCw,
  X
} from 'lucide-vue-next';

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  commandOpen: {
    type: Boolean,
    default: false
  },
  initialUrl: {
    type: String,
    default: 'https://www.zhihu.com/'
  },
  suspended: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'state-change']);

const BROWSER_WEBVIEW_LABEL = 'browser-view';
const viewportRef = ref(null);
const addressInputRef = ref(null);
const addressValue = ref(props.initialUrl);
const currentUrl = ref(props.initialUrl);
const isLoading = ref(false);
const isReady = ref(false);
const errorMessage = ref('');
const isDesktop = isTauri();

let browserWebview = null;
let resizeObserver = null;
let statePoller = null;
let loadingTimer = null;
let boundsFrame = null;
let boundsSyncing = false;
let unlistenNewWindow = null;

const displayHost = computed(() => {
  try {
    return new URL(currentUrl.value).hostname.replace(/^www\./, '') || 'Web';
  } catch {
    return 'Web';
  }
});

const emitState = () => {
  emit('state-change', {
    url: currentUrl.value,
    host: displayHost.value,
    title: displayHost.value,
    loading: isLoading.value,
    ready: isReady.value,
    error: errorMessage.value
  });
};

const normalizeAddress = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return currentUrl.value || props.initialUrl;

  if (/\s/.test(value)) {
    return `https://www.bing.com/search?q=${encodeURIComponent(value)}`;
  }

  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  const parsed = new URL(withScheme);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('仅支持 http 或 https 地址');
  }
  return parsed.toString();
};

const finishLoadingSoon = () => {
  if (loadingTimer) window.clearTimeout(loadingTimer);
  loadingTimer = window.setTimeout(() => {
    isLoading.value = false;
    emitState();
  }, 1100);
};

const updateCurrentUrl = (url) => {
  if (!url) return;
  currentUrl.value = url;
  if (document.activeElement !== addressInputRef.value) {
    addressValue.value = url;
  }
  emitState();
};

const pollBrowserState = async () => {
  if (!isDesktop || !isReady.value) return;
  try {
    const url = await invoke('browser_current_url');
    if (url && url !== currentUrl.value) {
      updateCurrentUrl(url);
      finishLoadingSoon();
    }
  } catch (error) {
    console.warn('[ZCode Browser] Failed to read current URL:', error);
  }
};

const startPolling = () => {
  if (statePoller) return;
  statePoller = window.setInterval(pollBrowserState, 700);
};

const stopPolling = () => {
  if (!statePoller) return;
  window.clearInterval(statePoller);
  statePoller = null;
};

const syncBounds = async () => {
  boundsFrame = null;
  if (!isDesktop || !browserWebview || !props.active || props.suspended || boundsSyncing) return;

  const rect = viewportRef.value?.getBoundingClientRect();
  if (!rect || rect.width < 2 || rect.height < 2) return;

  boundsSyncing = true;
  try {
    await browserWebview.setPosition(new LogicalPosition(Math.round(rect.left + 1), Math.round(rect.top + 1)));
    await browserWebview.setSize(new LogicalSize(
      Math.max(2, Math.round(rect.width - 2)),
      Math.max(2, Math.round(rect.height - 2))
    ));
    await browserWebview.show();
  } catch (error) {
    console.warn('[ZCode Browser] Failed to sync native bounds:', error);
  } finally {
    boundsSyncing = false;
  }
};

const scheduleBoundsSync = () => {
  if (boundsFrame) window.cancelAnimationFrame(boundsFrame);
  boundsFrame = window.requestAnimationFrame(syncBounds);
};

const createBrowserWebview = async (url) => {
  const rect = viewportRef.value?.getBoundingClientRect();
  if (!rect || rect.width < 2 || rect.height < 2) {
    await nextTick();
    scheduleBoundsSync();
  }

  const existing = await Webview.getByLabel(BROWSER_WEBVIEW_LABEL);
  if (existing) {
    browserWebview = existing;
    isReady.value = true;
    await scheduleBoundsSync();
    return false;
  }

  const bounds = viewportRef.value?.getBoundingClientRect();
  await invoke('browser_create', {
    url,
    x: Math.round((bounds?.left || 0) + 1),
    y: Math.round((bounds?.top || 0) + 1),
    width: Math.max(2, Math.round((bounds?.width || 800) - 2)),
    height: Math.max(2, Math.round((bounds?.height || 600) - 2))
  });

  browserWebview = await Webview.getByLabel(BROWSER_WEBVIEW_LABEL);
  if (!browserWebview) {
    throw new Error('原生网页视图创建后无法访问');
  }

  isReady.value = true;
  errorMessage.value = '';
  await syncBounds();
  startPolling();
  finishLoadingSoon();
  emitState();

  return true;
};

const ensureBrowser = async (url = currentUrl.value) => {
  if (!isDesktop) {
    errorMessage.value = '内嵌网页仅在 Tauri 桌面版中可用。';
    emitState();
    return;
  }

  try {
    const wasCreated = await createBrowserWebview(url);
    if (!wasCreated) {
      await browserWebview.show();
      await syncBounds();
    }
    startPolling();
  } catch (error) {
    isLoading.value = false;
    errorMessage.value = `无法启动网页视图：${error}`;
    emitState();
  }
};

const navigate = async (rawValue = addressValue.value) => {
  try {
    const url = normalizeAddress(rawValue);
    addressValue.value = url;
    currentUrl.value = url;
    errorMessage.value = '';
    isLoading.value = true;
    emitState();

    if (!isDesktop) {
      await ensureBrowser(url);
      isLoading.value = false;
      return;
    }

    if (!browserWebview) {
      const wasCreated = await createBrowserWebview(url);
      if (wasCreated) return;
    }

    await invoke('browser_navigate', { url });
    finishLoadingSoon();
  } catch (error) {
    isLoading.value = false;
    errorMessage.value = error instanceof Error ? error.message : String(error);
    emitState();
  }
};

const goBack = async () => {
  if (!isDesktop || !isReady.value) return;
  isLoading.value = true;
  emitState();
  await invoke('browser_go_back');
  finishLoadingSoon();
};

const goForward = async () => {
  if (!isDesktop || !isReady.value) return;
  isLoading.value = true;
  emitState();
  await invoke('browser_go_forward');
  finishLoadingSoon();
};

const reload = async () => {
  if (!isDesktop || !isReady.value) {
    await navigate(currentUrl.value);
    return;
  }
  isLoading.value = true;
  emitState();
  await invoke('browser_reload');
  finishLoadingSoon();
};

const openExternal = async () => {
  try {
    const url = normalizeAddress(currentUrl.value);
    if (isDesktop) {
      await invoke('open_external_url', { url });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    errorMessage.value = String(error);
    emitState();
  }
};

const focusAddress = () => {
  addressInputRef.value?.focus();
  addressInputRef.value?.select();
};

const handleAddressSubmit = () => {
  navigate(addressValue.value);
  addressInputRef.value?.blur();
};

watch(
  () => [props.active, props.suspended],
  async ([active, suspended]) => {
    await nextTick();
    if (!isDesktop) return;

    if (active && !suspended) {
      await ensureBrowser(currentUrl.value || props.initialUrl);
      scheduleBoundsSync();
      return;
    }

    stopPolling();
    try {
      await browserWebview?.hide();
    } catch (error) {
      console.warn('[ZCode Browser] Failed to hide native webview:', error);
    }
  },
  { immediate: true }
);

watch(
  () => props.commandOpen,
  async () => {
    await nextTick();
    scheduleBoundsSync();
  }
);

onMounted(async () => {
  if (isDesktop) {
    unlistenNewWindow = await listen('browser-new-window', (event) => {
      if (typeof event.payload === 'string') {
        navigate(event.payload);
      }
    });
  }

  resizeObserver = new ResizeObserver(scheduleBoundsSync);
  if (viewportRef.value) resizeObserver.observe(viewportRef.value);
  window.addEventListener('resize', scheduleBoundsSync);
  emitState();
});

onUnmounted(async () => {
  stopPolling();
  if (loadingTimer) window.clearTimeout(loadingTimer);
  if (boundsFrame) window.cancelAnimationFrame(boundsFrame);
  resizeObserver?.disconnect();
  unlistenNewWindow?.();
  unlistenNewWindow = null;
  window.removeEventListener('resize', scheduleBoundsSync);

  try {
    await browserWebview?.hide();
  } catch (error) {
    console.warn('[ZCode Browser] Failed to hide webview during cleanup:', error);
  }
});

defineExpose({ focusAddress, goBack, goForward, navigate, reload });
</script>

<template>
  <section class="zcode-browser-surface" :class="{ 'has-command-box': commandOpen }">
    <div class="zcode-browser-toolbar zcode-no-drag">
      <div class="zcode-browser-navigation">
        <button class="zcode-browser-tool" :disabled="!isReady" title="后退" @click="goBack">
          <ArrowLeft :size="17" />
        </button>
        <button class="zcode-browser-tool" :disabled="!isReady" title="前进" @click="goForward">
          <ArrowRight :size="17" />
        </button>
        <button class="zcode-browser-tool" title="刷新" @click="reload">
          <Loader2 v-if="isLoading" :size="16" class="zcode-browser-spin" />
          <RefreshCw v-else :size="16" />
        </button>
      </div>

      <form class="zcode-browser-address" @submit.prevent="handleAddressSubmit">
        <LockKeyhole :size="14" class="zcode-browser-security" />
        <input
          ref="addressInputRef"
          v-model="addressValue"
          autocomplete="off"
          inputmode="url"
          aria-label="网页地址"
          spellcheck="false"
          placeholder="输入 URL 或搜索内容"
          @focus="$event.target.select()"
        />
        <span class="zcode-browser-host">{{ displayHost }}</span>
      </form>

      <button class="zcode-browser-tool" title="在系统浏览器中打开" @click="openExternal">
        <ExternalLink :size="16" />
      </button>
      <button class="zcode-browser-tool" title="关闭网页模式" @click="emit('close')">
        <X :size="17" />
      </button>
    </div>

    <div class="zcode-browser-progress" :class="{ active: isLoading }"><span></span></div>

    <div class="zcode-browser-viewport-shell">
      <div ref="viewportRef" class="zcode-browser-viewport">
        <div v-if="!isDesktop || errorMessage" class="zcode-browser-fallback">
          <div class="zcode-browser-fallback-icon"><Globe2 :size="28" /></div>
          <div class="zcode-browser-fallback-title">
            {{ errorMessage || '请在 ZCode 桌面版中打开网页' }}
          </div>
          <div class="zcode-browser-fallback-copy">
            Web 预览模式不会使用 iframe 冒充完整浏览器；桌面版会在这里加载原生网页视图。
          </div>
          <button class="zcode-browser-fallback-action" @click="openExternal">
            <ExternalLink :size="15" />
            使用系统浏览器打开
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.zcode-browser-surface {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: #111111;
}

.zcode-browser-toolbar {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #171717;
  border-bottom: 1px solid #2a2a2a;
}

.zcode-browser-navigation {
  display: flex;
  align-items: center;
  gap: 2px;
}

.zcode-browser-tool {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  align-items: center;
  justify-content: center;
  color: #a8a8a8;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.zcode-browser-tool:hover:not(:disabled) {
  color: #eeeeee;
  background: rgba(255, 255, 255, 0.075);
}

.zcode-browser-tool:disabled {
  color: #4f4f4f;
  cursor: default;
}

.zcode-browser-address {
  display: flex;
  min-width: 120px;
  height: 31px;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  background: #242424;
  border: 1px solid #353535;
  border-radius: 9px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}

.zcode-browser-address:focus-within {
  background: #272727;
  border-color: #5b5b5b;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.055);
}

.zcode-browser-security {
  flex: 0 0 auto;
  color: #7e9f78;
}

.zcode-browser-address input {
  min-width: 0;
  height: 100%;
  flex: 1 1 auto;
  color: #dddddd;
  background: transparent;
  border: 0;
  outline: 0;
  font-family: "Segoe UI", "Microsoft YaHei UI", sans-serif;
  font-size: 12px;
}

.zcode-browser-address input::placeholder {
  color: #727272;
}

.zcode-browser-host {
  max-width: 140px;
  overflow: hidden;
  color: #737373;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zcode-browser-progress {
  position: relative;
  z-index: 2;
  height: 2px;
  overflow: hidden;
  background: #151515;
}

.zcode-browser-progress span {
  display: block;
  width: 34%;
  height: 100%;
  opacity: 0;
  background: linear-gradient(90deg, transparent, #a8c2ff, transparent);
  transform: translateX(-120%);
}

.zcode-browser-progress.active span {
  opacity: 1;
  animation: zcode-browser-loading 1.15s ease-in-out infinite;
}

.zcode-browser-viewport-shell {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  padding: 10px 12px 12px;
  transition: padding-bottom 0.16s ease;
}

.zcode-browser-surface.has-command-box .zcode-browser-viewport-shell {
  padding-bottom: calc(var(--zc-commandbox-h) + 68px);
}

.zcode-browser-viewport {
  position: relative;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  background: #f7f7f7;
  border: 1px solid #303030;
  border-radius: 9px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
}

.zcode-browser-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 32px;
  color: #bdbdbd;
  background: #111111;
  text-align: center;
}

.zcode-browser-fallback-icon {
  display: inline-flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  color: #9c9c9c;
  background: #242424;
  border: 1px solid #343434;
  border-radius: 15px;
}

.zcode-browser-fallback-title {
  max-width: 620px;
  margin-top: 18px;
  color: #e1e1e1;
  font-size: 15px;
  font-weight: 650;
}

.zcode-browser-fallback-copy {
  max-width: 540px;
  margin-top: 7px;
  color: #767676;
  font-size: 12px;
  line-height: 1.7;
}

.zcode-browser-fallback-action {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  padding: 0 13px;
  color: #d8d8d8;
  background: #2a2a2a;
  border: 1px solid #3e3e3e;
  border-radius: 8px;
  cursor: pointer;
}

.zcode-browser-fallback-action:hover {
  background: #333333;
}

.zcode-browser-spin {
  animation: zcode-browser-spin 0.85s linear infinite;
}

@keyframes zcode-browser-loading {
  to { transform: translateX(410%); }
}

@keyframes zcode-browser-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 780px) {
  .zcode-browser-toolbar {
    padding-inline: 8px;
  }

  .zcode-browser-host {
    display: none;
  }

  .zcode-browser-viewport-shell {
    padding: 6px 6px 8px;
  }

  .zcode-browser-surface.has-command-box .zcode-browser-viewport-shell {
    padding-bottom: 180px;
  }
}
</style>

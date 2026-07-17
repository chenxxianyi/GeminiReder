import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useBookStore } from '../stores/bookStore';
import ePub from 'epubjs';

const DEFAULT_THEME = {
  dark: {
    background: '#111111',
    text: '#d4d4d4',
    heading: '#e8c06d',
    border: '#2f2f2f',
    scrollbar: 'rgba(212, 212, 212, 0.22)',
    scrollbarHover: 'rgba(212, 212, 212, 0.38)'
  },
  light: {
    background: '#ffffff',
    text: '#1f1f1f',
    heading: '#7f4f00',
    border: '#d9d9d9',
    scrollbar: 'rgba(95, 99, 104, 0.28)',
    scrollbarHover: 'rgba(95, 99, 104, 0.45)'
  }
};

const buildToc = (items = []) => {
  return items.map((item, index) => ({
    ...item,
    id: item.id || item.href || `toc-${index}`,
    href: item.href || item.id,
    label: item.label || item.title || `Section ${index + 1}`,
    subitems: buildToc(item.subitems || [])
  }));
};

const isTypingTarget = (target) => {
  if (!target || !target.tagName) return false;
  const tagName = target.tagName.toUpperCase();
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
};

const normalizeHref = (href = '') => {
  const cleanedHref = String(href)
    .replace(/\\/g, '/')
    .split('?')[0]
    .split('#')[0]
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');

  try {
    return decodeURIComponent(cleanedHref);
  } catch {
    return cleanedHref;
  }
};

const getHrefTail = (href = '') => normalizeHref(href).split('/').filter(Boolean).pop() || '';

const flattenToc = (items = []) => {
  return items.flatMap((item) => [item, ...flattenToc(item.subitems || [])]);
};

export function useEpubReader() {
  const bookStore = useBookStore();

  const readerArea = ref(null);
  const toc = ref([]);
  const activeTocHref = ref('');
  const currentChapterLabel = ref('');
  const isDark = ref(true);
  const isLoading = ref(false);

  let book = null;
  let rendition = null;
  let resizeRaf = 0;
  let initRequestId = 0;

  const getThemeColors = () => {
    return isDark.value ? DEFAULT_THEME.dark : DEFAULT_THEME.light;
  };

  const clampReaderFontSize = (value) => {
    const parsedSize = Number(value);
    if (!Number.isFinite(parsedSize)) return 14;
    return Math.min(Math.max(parsedSize, 12), 24);
  };

  const getReaderTypography = () => {
    const baseSize = clampReaderFontSize(bookStore.fontSize);
    return {
      fontFamily: `"${bookStore.fontFamily}", "Noto Sans SC", "Microsoft YaHei UI", "Segoe UI", system-ui, sans-serif`,
      fontSize: `${baseSize}px`,
      h1Size: `${Math.round(baseSize * 1.85)}px`,
      h2Size: `${Math.round(baseSize * 1.55)}px`,
      h3Size: `${Math.round(baseSize * 1.25)}px`
    };
  };

  const applyFontThemeToView = (view) => {
    if (!view?.document) return;

    const doc = view.document;
    const head = doc.querySelector('head');
    if (!head) return;

    const existingStyle = doc.querySelector('#zcode-reader-theme');
    if (existingStyle) {
      existingStyle.remove();
    }

    const colors = getThemeColors();
    const { fontFamily, fontSize, h1Size, h2Size, h3Size } = getReaderTypography();

    const style = doc.createElement('style');
    style.id = 'zcode-reader-theme';
    style.textContent = `
      html, body {
        background-color: ${colors.background} !important;
        color: ${colors.text} !important;
        font-family: ${fontFamily} !important;
        min-height: 100% !important;
        margin: 0 !important;
        padding-top: 0 !important;
        overflow-x: hidden !important;
        letter-spacing: 0 !important;
      }
      body {
        display: block !important;
        height: auto !important;
        padding: 0 0 320px !important;
        margin: 0 !important;
        max-width: none !important;
        box-sizing: border-box !important;
      }
      body > *,
      body > *:first-child {
        margin-top: 0 !important;
        padding-top: 0 !important;
      }
      body > section,
      body > article,
      body > main,
      body > div {
        display: block !important;
        height: auto !important;
        min-height: 0 !important;
        align-items: flex-start !important;
        justify-content: flex-start !important;
      }
      section, article, main, div {
        vertical-align: top !important;
      }
      body > section,
      body > article,
      body > main,
      body > div,
      body > nav + section,
      body > nav + article,
      body > nav + main {
        width: 100% !important;
        max-width: none !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      p, span, li, div, section, article, blockquote {
        background-color: transparent !important;
        color: ${colors.text} !important;
        font-family: ${fontFamily} !important;
        font-size: ${fontSize} !important;
        line-height: 2.08 !important;
        letter-spacing: 0 !important;
      }
      p {
        margin: 0 0 1.02em !important;
        text-indent: 2em !important;
      }
      h1, h2, h3, h4, h5, h6 {
        color: ${colors.heading} !important;
        font-family: ${fontFamily} !important;
        font-weight: 800 !important;
        line-height: 1.25 !important;
        border-bottom: 1px solid ${colors.border} !important;
        padding: 0 0 0.72em !important;
        margin: 0 0 2.2em !important;
        text-indent: 0 !important;
      }
      h1::before,
      h2::before {
        content: "" !important;
        display: inline-block !important;
        width: 39px !important;
        height: 5px !important;
        margin-right: 42px !important;
        vertical-align: middle !important;
        background: ${colors.heading} !important;
        border-radius: 1px !important;
      }
      h1 {
        font-size: ${h1Size} !important;
      }
      h2 {
        font-size: ${h2Size} !important;
      }
      h3 {
        font-size: ${h3Size} !important;
        margin-top: 1.45em !important;
      }
      ol, ul {
        margin: 0 0 1.1em 2em !important;
        padding: 0 !important;
      }
      li {
        margin: 0 0 0.55em !important;
        padding-left: 0.25em !important;
      }
      blockquote {
        margin: 1.15em 0 1.35em 2em !important;
        padding: 0 0 0 1.2em !important;
        border-left: 2px solid ${colors.border} !important;
        color: ${colors.text} !important;
      }
      a {
        color: ${colors.heading} !important;
        text-decoration: none !important;
      }
      pre, code {
        font-family: ${fontFamily} !important;
      }
      img, svg {
        max-width: 100% !important;
        opacity: 0.9;
        filter: saturate(0.85);
      }
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: ${colors.scrollbar};
        border-radius: 999px;
      }
    `;

    head.appendChild(style);
  };

  const applyFontTheme = () => {
    if (!rendition) return;

    const colors = getThemeColors();
    const { fontFamily, fontSize, h1Size, h2Size, h3Size } = getReaderTypography();

    rendition.themes.default({
      body: {
        'background-color': `${colors.background} !important`,
        color: `${colors.text} !important`,
        'font-family': `${fontFamily} !important`,
        'min-height': '100% !important',
        display: 'block !important',
        height: 'auto !important',
        'padding-top': '0 !important',
        'overflow-x': 'hidden !important',
        'letter-spacing': '0 !important',
        padding: '0 0 320px !important',
        margin: '0 !important',
        'max-width': 'none !important',
        'box-sizing': 'border-box !important'
      },
      'body > *, body > *:first-child': {
        'margin-top': '0 !important',
        'padding-top': '0 !important'
      },
      'body > section, body > article, body > main, body > div': {
        display: 'block !important',
        height: 'auto !important',
        'min-height': '0 !important',
        'align-items': 'flex-start !important',
        'justify-content': 'flex-start !important'
      },
      'section, article, main, div': {
        'vertical-align': 'top !important'
      },
      'body > section, body > article, body > main, body > div, body > nav + section, body > nav + article, body > nav + main': {
        width: '100% !important',
        'max-width': 'none !important',
        'margin-left': '0 !important',
        'margin-right': '0 !important'
      },
      'p, span, li, div, section, article, blockquote': {
        'background-color': 'transparent !important',
        color: `${colors.text} !important`,
        'font-family': `${fontFamily} !important`,
        'font-size': `${fontSize} !important`,
        'line-height': '2.08 !important',
        'letter-spacing': '0 !important'
      },
      p: {
        margin: '0 0 1.02em !important',
        'text-indent': '2em !important'
      },
      'h1, h2, h3, h4, h5, h6': {
        color: `${colors.heading} !important`,
        'font-family': `${fontFamily} !important`,
        'font-weight': '800 !important',
        'line-height': '1.25 !important',
        'border-bottom': `1px solid ${colors.border} !important`,
        padding: '0 0 0.72em !important',
        margin: '0 0 2.2em !important',
        'text-indent': '0 !important'
      },
      'h1::before, h2::before': {
        content: '"" !important',
        display: 'inline-block !important',
        width: '39px !important',
        height: '5px !important',
        'margin-right': '42px !important',
        'vertical-align': 'middle !important',
        background: `${colors.heading} !important`,
        'border-radius': '1px !important'
      },
      h1: {
        'font-size': `${h1Size} !important`
      },
      h2: {
        'font-size': `${h2Size} !important`
      },
      h3: {
        'font-size': `${h3Size} !important`,
        'margin-top': '1.45em !important'
      },
      'ol, ul': {
        margin: '0 0 1.1em 2em !important',
        padding: '0 !important'
      },
      li: {
        margin: '0 0 0.55em !important',
        'padding-left': '0.25em !important'
      },
      blockquote: {
        margin: '1.15em 0 1.35em 2em !important',
        padding: '0 0 0 1.2em !important',
        'border-left': `2px solid ${colors.border} !important`,
        color: `${colors.text} !important`
      },
      a: {
        color: `${colors.heading} !important`,
        'text-decoration': 'none !important'
      },
      'pre, code': {
        'font-family': `${fontFamily} !important`
      },
      'img, svg': {
        'max-width': '100% !important',
        opacity: '0.9',
        filter: 'saturate(0.85)'
      },
      html: {
        'scrollbar-width': 'thin',
        'scrollbar-color': `${colors.scrollbar} transparent`
      },
      '::-webkit-scrollbar': {
        width: '6px',
        height: '6px'
      },
      '::-webkit-scrollbar-track': {
        background: 'transparent'
      },
      '::-webkit-scrollbar-thumb': {
        'background-color': colors.scrollbar,
        'border-radius': '999px'
      },
      '::-webkit-scrollbar-thumb:hover': {
        'background-color': colors.scrollbarHover
      }
    });

    if (rendition.views) {
      rendition.views().forEach((view) => {
        applyFontThemeToView(view);
        if (view?.pane) view.pane.render();
      });
    }
  };

  const destroyReader = () => {
    if (resizeRaf) {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = 0;
    }

    if (book) {
      book.destroy();
      book = null;
      rendition = null;
    }

    if (readerArea.value) {
      readerArea.value.innerHTML = '';
    }

    toc.value = [];
    activeTocHref.value = '';
    currentChapterLabel.value = '';
  };

  const waitForReaderArea = async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const area = readerArea.value;
      if (area?.clientWidth > 0 && area?.clientHeight > 0) {
        return area;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return readerArea.value;
  };

  const renderReaderMessage = (message) => {
    if (!readerArea.value) return;
    readerArea.value.innerHTML = `
      <div style="
        min-height: 100%;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        padding: 88px 64px;
        color: #8f8f8f;
        font: 600 18px/1.6 'Noto Sans SC', 'Microsoft YaHei UI', 'Segoe UI', sans-serif;
      ">
        ${message}
      </div>
    `;
  };

  const handleResize = () => {
    if (!rendition || !readerArea.value) return;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      try {
        rendition.resize(readerArea.value.clientWidth, readerArea.value.clientHeight);
      } catch (error) {
        console.error('Failed to resize rendition:', error);
      }
    });
  };

  const saveProgress = () => {
    if (!rendition || !bookStore.currentBookId) return;
    const location = rendition.currentLocation();
    const cfi = location?.start?.cfi;
    if (cfi) {
      bookStore.updateProgress(bookStore.currentBookId, cfi);
    }
  };

  const syncActiveTocFromHref = (href) => {
    const normalizedHref = normalizeHref(href);
    if (!normalizedHref) return;

    const items = flattenToc(toc.value);
    const exactMatch = items.find((item) => normalizeHref(item.href) === normalizedHref);
    const tail = getHrefTail(normalizedHref);
    const activeItem = exactMatch || items.find((item) => getHrefTail(item.href) === tail);

    activeTocHref.value = activeItem?.href || href;
    currentChapterLabel.value = activeItem?.label || '';
  };

  const syncActiveTocFromLocation = (location) => {
    const href = location?.start?.href || location?.end?.href;
    if (href) {
      syncActiveTocFromHref(href);
    }
  };

  const getCurrentCfi = () => {
    if (!rendition) return null;
    const location = rendition.currentLocation();
    return location?.start?.cfi || null;
  };

  const nextSection = () => {
    if (rendition) {
      rendition.next();
    }
  };

  const prevSection = () => {
    if (rendition) {
      rendition.prev();
    }
  };

  const jumpToCfi = async (cfi) => {
    if (!rendition || !cfi) return;
    await rendition.display(cfi);
  };

  const navigateToChapter = async (href) => {
    if (!rendition || !book || !href) return;

    try {
      syncActiveTocFromHref(href);
      await rendition.display(href);
      await new Promise((resolve) => setTimeout(resolve, 150));
      applyFontTheme();
      handleResize();

      const iframe = readerArea.value?.querySelector('iframe');
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.scrollTo(0, 0);
        } catch {}
      }
    } catch (error) {
      console.error('Navigation error:', error);
      try {
        const spineItem = book.spine.get(href);
        if (spineItem) {
          await rendition.display(spineItem.index);
          syncActiveTocFromHref(href);
          await new Promise((resolve) => setTimeout(resolve, 150));
          applyFontTheme();
          handleResize();
          return;
        }
      } catch (spineError) {
        console.error('Spine navigation failed:', spineError);
      }

      const cleanHref = href.split('#')[0];
      try {
        await rendition.display(cleanHref);
        syncActiveTocFromHref(cleanHref);
        await new Promise((resolve) => setTimeout(resolve, 150));
        applyFontTheme();
        handleResize();
      } catch (fallbackError) {
        console.error('Fallback chapter navigation failed:', fallbackError);
      }
    }
  };

  const handleReaderKeydown = (event) => {
    if (!rendition) return;
    if (isTypingTarget(event.target)) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      prevSection();
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Enter') {
      event.preventDefault();
      nextSection();
    }
  };

  const initReader = async () => {
    const requestId = ++initRequestId;
    if (!bookStore.currentBookId || !readerArea.value) return;

    isLoading.value = true;
    destroyReader();

    const area = await waitForReaderArea();
    if (requestId !== initRequestId) return;
    if (!area || area.clientWidth <= 0 || area.clientHeight <= 0) {
      renderReaderMessage('Task content is waiting for a stable workspace size.');
      isLoading.value = false;
      return;
    }

    const bookData = await bookStore.getBookData(bookStore.currentBookId);
    if (requestId !== initRequestId) return;
    if (!bookData) {
      renderReaderMessage('Task content is unavailable. Please import this task file again.');
      isLoading.value = false;
      return;
    }

    try {
      const arrayBuffer = await bookData.arrayBuffer();
      if (requestId !== initRequestId) return;

      book = ePub(arrayBuffer);
      const renderWidth = Math.max(area.clientWidth, 320);
      const renderHeight = Math.max(area.clientHeight, 320);

      rendition = book.renderTo(area, {
        width: renderWidth,
        height: renderHeight,
        flow: 'scrolled-doc',
        // Keep only the active chapter mounted. The continuous manager retains
        // multiple iframe views and their decoded images on long reading sessions.
        manager: 'default'
      });

      rendition.on('rendered', (_, view) => {
        if (!view?.document) return;
        view.document.addEventListener('keydown', handleReaderKeydown);
        applyFontThemeToView(view);
      });

      rendition.on('relocated', (location) => {
        const cfi = location?.start?.cfi;
        if (bookStore.currentBookId && cfi) {
          bookStore.updateProgress(bookStore.currentBookId, cfi);
        }
        syncActiveTocFromLocation(location);
      });

      const navigation = await book.loaded.navigation;
      if (requestId !== initRequestId) return;
      toc.value = buildToc(navigation?.toc || []);

      await rendition.display();
      if (requestId !== initRequestId) return;
      syncActiveTocFromLocation(rendition.currentLocation());
      applyFontTheme();
      handleResize();

      const currentBook = bookStore.books.find((entry) => entry.id === bookStore.currentBookId);
      if (currentBook?.cfi) {
        try {
          await rendition.display(currentBook.cfi);
        } catch (restoreError) {
          console.warn('[ZCode] Failed to restore reader location, opening the first section:', restoreError);
          await rendition.display();
        }
        if (requestId !== initRequestId) return;
        syncActiveTocFromLocation(rendition.currentLocation());
        applyFontTheme();
      }

      handleResize();
    } catch (error) {
      if (requestId === initRequestId) {
        console.error('Error rendering book:', error);
        renderReaderMessage('Task content failed to render. Try reopening the task.');
      }
    } finally {
      if (requestId === initRequestId) {
        isLoading.value = false;
      }
    }
  };

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    if (isDark.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    applyFontTheme();
  };

  watch([() => bookStore.fontFamily, () => bookStore.fontSize], () => {
    applyFontTheme();
  });

  onMounted(() => {
    window.addEventListener('resize', handleResize);
    if (isDark.value) {
      document.documentElement.classList.add('dark');
    }
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    destroyReader();
  });

  return {
    readerArea,
    toc,
    activeTocHref,
    currentChapterLabel,
    isDark,
    isLoading,
    initReader,
    destroyReader,
    applyFontTheme,
    applyFontThemeToView,
    nextSection,
    prevSection,
    jumpToCfi,
    navigateToChapter,
    handleKeydown: handleReaderKeydown,
    handleResize,
    toggleTheme,
    getCurrentCfi,
    saveProgress
  };
}

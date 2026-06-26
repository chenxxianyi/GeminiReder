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

export function useEpubReader() {
  const bookStore = useBookStore();

  const readerArea = ref(null);
  const toc = ref([]);
  const isDark = ref(true);
  const isLoading = ref(false);

  let book = null;
  let rendition = null;
  let resizeRaf = 0;

  const getThemeColors = () => {
    return isDark.value ? DEFAULT_THEME.dark : DEFAULT_THEME.light;
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
    const fontFamily = `"${bookStore.fontFamily}", "JetBrains Mono", "Fira Code", "Noto Sans SC", monospace`;
    const fontSize = `${bookStore.fontSize}px`;

    const style = doc.createElement('style');
    style.id = 'zcode-reader-theme';
    style.textContent = `
      html, body {
        background-color: ${colors.background} !important;
        color: ${colors.text} !important;
        font-family: ${fontFamily} !important;
      }
      body {
        padding: 40px 32px !important;
        margin: 0 auto !important;
        max-width: 920px !important;
        box-sizing: border-box !important;
      }
      p, span, li, div, section, article, blockquote {
        background-color: transparent !important;
        color: ${colors.text} !important;
        font-family: ${fontFamily} !important;
        font-size: ${fontSize} !important;
        line-height: 1.85 !important;
      }
      h1, h2, h3, h4, h5, h6 {
        color: ${colors.heading} !important;
        font-family: ${fontFamily} !important;
        font-weight: 600 !important;
        line-height: 1.35 !important;
        border-bottom: 1px solid ${colors.border} !important;
        padding-bottom: 0.45em !important;
        margin-top: 1.8em !important;
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
    const fontFamily = `"${bookStore.fontFamily}", "JetBrains Mono", "Fira Code", "Noto Sans SC", monospace`;
    const fontSize = `${bookStore.fontSize}px`;

    rendition.themes.default({
      body: {
        'background-color': `${colors.background} !important`,
        color: `${colors.text} !important`,
        'font-family': `${fontFamily} !important`,
        padding: '40px 32px !important',
        margin: '0 auto !important',
        'max-width': '920px !important',
        'box-sizing': 'border-box !important'
      },
      'p, span, li, div, section, article, blockquote': {
        'background-color': 'transparent !important',
        color: `${colors.text} !important`,
        'font-family': `${fontFamily} !important`,
        'font-size': `${fontSize} !important`,
        'line-height': '1.85 !important'
      },
      'h1, h2, h3, h4, h5, h6': {
        color: `${colors.heading} !important`,
        'font-family': `${fontFamily} !important`,
        'font-weight': '600 !important',
        'line-height': '1.35 !important',
        'border-bottom': `1px solid ${colors.border} !important`,
        'padding-bottom': '0.45em !important',
        'margin-top': '1.8em !important'
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
      await rendition.display(href);
      await new Promise((resolve) => setTimeout(resolve, 150));

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
          return;
        }
      } catch (spineError) {
        console.error('Spine navigation failed:', spineError);
      }

      const cleanHref = href.split('#')[0];
      try {
        await rendition.display(cleanHref);
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
    if (!bookStore.currentBookId || !readerArea.value) return;

    isLoading.value = true;
    destroyReader();

    const bookData = await bookStore.getBookData(bookStore.currentBookId);
    if (!bookData) {
      isLoading.value = false;
      return;
    }

    try {
      const arrayBuffer = await bookData.arrayBuffer();
      book = ePub(arrayBuffer);
      rendition = book.renderTo(readerArea.value, {
        width: '100%',
        height: '100%',
        flow: 'scrolled-doc',
        manager: 'continuous'
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
      });

      const navigation = await book.loaded.navigation;
      toc.value = buildToc(navigation?.toc || []);

      await rendition.display();
      applyFontTheme();

      const currentBook = bookStore.books.find((entry) => entry.id === bookStore.currentBookId);
      if (currentBook?.cfi) {
        await rendition.display(currentBook.cfi);
      }

      handleResize();
    } catch (error) {
      console.error('Error rendering book:', error);
    } finally {
      isLoading.value = false;
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

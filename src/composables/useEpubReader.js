import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useBookStore } from '../stores/bookStore';
import ePub from 'epubjs';

/**
 * EPUB Reader Composable
 * Handles all EPUB rendering logic, can be reused by different shells
 */
export function useEpubReader() {
  const bookStore = useBookStore();

  // State
  const readerArea = ref(null);
  const toc = ref([]);
  const isDark = ref(true);
  const isLoading = ref(false);

  // Internal state
  let book = null;
  let rendition = null;
  let resizeRaf = 0;

  /**
   * Initialize the reader with current book
   */
  const initReader = async () => {
    if (!bookStore.currentBookId || !readerArea.value) return;

    isLoading.value = true;

    // Clean up existing book
    if (book) {
      book.destroy();
      book = null;
      rendition = null;
      if (readerArea.value) readerArea.value.innerHTML = '';
    }

    const bookData = await bookStore.getBookData(bookStore.currentBookId);
    if (!bookData) {
      isLoading.value = false;
      return;
    }

    const arrayBuffer = await bookData.arrayBuffer();

    try {
      book = ePub(arrayBuffer);
      rendition = book.renderTo(readerArea.value, {
        width: '100%',
        height: '100%',
        flow: 'scrolled-doc',
        manager: 'continuous'
      });

      applyFontTheme();

      rendition.on('rendered', (section, view) => {
        const iframe = view.document;
        if (iframe) {
          iframe.addEventListener('keydown', handleKeydown);
          applyFontThemeToView(view);
        }
      });

      const navigation = await book.loaded.navigation;

      const processTocItems = (items) => {
        return items.map(item => {
          const processed = {
            ...item,
            href: item.href || item.id,
            label: item.label || item.title || '未命名章节'
          };

          if (item.subitems && item.subitems.length > 0) {
            processed.subitems = processTocItems(item.subitems);
          }

          return processed;
        });
      };

      toc.value = processTocItems(navigation.toc || []);

      await rendition.display();

      // Re-apply theme to ensure it takes effect after display
      applyFontTheme();

      const currentBookObj = bookStore.books.find(b => b.id === bookStore.currentBookId);
      if (currentBookObj && currentBookObj.cfi) {
        await rendition.display(currentBookObj.cfi);
      }

      rendition.on('relocated', (location) => {
        bookStore.updateProgress(bookStore.currentBookId, location.start.cfi);
      });

      handleResize();
    } catch (e) {
      console.error("Error rendering book:", e);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Destroy the reader and clean up
   */
  const destroyReader = () => {
    if (book) {
      book.destroy();
      book = null;
      rendition = null;
      if (readerArea.value) readerArea.value.innerHTML = '';
    }
  };

  /**
   * Apply font theme to a specific view (iframe)
   */
  const applyFontThemeToView = (view) => {
    if (!view || !view.document) return;

    const doc = view.document;
    const head = doc.querySelector('head');
    if (!head) return;

    // Remove existing custom style
    const existingStyle = doc.querySelector('#gemini-theme-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    const fontFamily = `"${bookStore.fontFamily}", monospace`;
    const fontSize = `${bookStore.fontSize}px`;

    const bgColor = isDark.value ? '#131314' : '#ffffff';
    const textColor = isDark.value ? '#e3e3e3' : '#1f1f1f';
    const headingColor = isDark.value ? '#a8c7fa' : '#1b6ef3';
    const borderColor = isDark.value ? '#444746' : '#e0e3e1';

    const style = doc.createElement('style');
    style.id = 'gemini-theme-style';
    style.textContent = `
      html, body {
        background-color: ${bgColor} !important;
        color: ${textColor} !important;
        font-family: ${fontFamily} !important;
      }
      body {
        padding: 0 16px !important;
        margin: 0 auto !important;
        max-width: 760px !important;
        box-sizing: border-box !important;
      }
      p, span, li, div, section {
        font-family: ${fontFamily} !important;
        color: ${textColor} !important;
        line-height: 1.8 !important;
        font-size: ${fontSize} !important;
        background-color: transparent !important;
      }
      h1, h2, h3, h4, h5, h6 {
        color: ${headingColor} !important;
        font-family: ${fontFamily} !important;
        font-weight: bold !important;
        border-bottom: 1px solid ${borderColor} !important;
        padding-bottom: 0.5em !important;
        margin-top: 1.5em !important;
      }
      a {
        color: ${headingColor} !important;
        text-decoration: none !important;
      }
      img {
        opacity: 0.9;
        filter: grayscale(0%);
        border: none;
        max-width: 100% !important;
      }
      ::-webkit-scrollbar {
        display: none;
      }
    `;
    head.appendChild(style);
  };

  /**
   * Apply font theme to all views
   */
  const applyFontTheme = () => {
    if (!rendition) return;

    // Apply to all current views
    if (rendition.views) {
      rendition.views().forEach(view => {
        applyFontThemeToView(view);
      });
    }

    const fontFamily = `"${bookStore.fontFamily}", monospace`;
    const fontSize = `${bookStore.fontSize}px`;

    const bgColor = isDark.value ? '#131314' : '#ffffff';
    const textColor = isDark.value ? '#e3e3e3' : '#1f1f1f';
    const headingColor = isDark.value ? '#a8c7fa' : '#1b6ef3';
    const borderColor = isDark.value ? '#444746' : '#e0e3e1';
    const scrollThumb = isDark.value ? 'rgba(196, 199, 197, 0.22)' : 'rgba(95, 99, 104, 0.28)';
    const scrollThumbHover = isDark.value ? 'rgba(196, 199, 197, 0.35)' : 'rgba(95, 99, 104, 0.45)';

    rendition.themes.default({
      'body': {
        'background-color': `${bgColor} !important`,
        'color': `${textColor} !important`,
        'font-family': `${fontFamily} !important`,
        'padding': '0 16px !important',
        'margin': '0 auto !important',
        'max-width': '760px !important',
        'box-sizing': 'border-box !important'
      },
      'p, span, li, div, section': {
        'font-family': `${fontFamily} !important`,
        'color': `${textColor} !important`,
        'line-height': '1.8 !important',
        'font-size': `${fontSize} !important`,
        'background-color': 'transparent !important'
      },
      'h1, h2, h3, h4, h5, h6': {
        'color': `${headingColor} !important`,
        'font-family': `${fontFamily} !important`,
        'font-weight': 'bold !important',
        'border-bottom': `1px solid ${borderColor} !important`,
        'padding-bottom': '0.5em !important',
        'margin-top': '1.5em !important'
      },
      'a': {
        'color': `${headingColor} !important`,
        'text-decoration': 'none !important'
      },
      'img': {
        'opacity': '0.9',
        'filter': 'grayscale(0%)',
        'border': 'none',
        'max-width': '100% !important'
      },
      'html': {
        'scrollbar-width': 'thin',
        'scrollbar-color': `${scrollThumb} transparent`
      },
      '::-webkit-scrollbar': {
        'width': '4px',
        'height': '4px'
      },
      '::-webkit-scrollbar-track': {
        'background': 'transparent'
      },
      '::-webkit-scrollbar-thumb': {
        'background-color': scrollThumb,
        'border-radius': '999px'
      },
      '::-webkit-scrollbar-thumb:hover': {
        'background-color': scrollThumbHover
      }
    });

    // Force update views
    if (rendition.views) {
      rendition.views().forEach(view => {
        if (view && view.pane) view.pane.render();
      });
    }
  };

  /**
   * Navigate to next section
   */
  const nextSection = () => {
    if (rendition) {
      rendition.next();
    }
  };

  /**
   * Navigate to previous section
   */
  const prevSection = () => {
    if (rendition) {
      rendition.prev();
    }
  };

  /**
   * Jump to specific CFI
   */
  const jumpToCfi = async (cfi) => {
    if (rendition && cfi) {
      await rendition.display(cfi);
    }
  };

  /**
   * Navigate to chapter by href
   */
  const navigateToChapter = async (href) => {
    if (!rendition || !href || !book) return;

    try {
      await rendition.display(href);
      await new Promise(resolve => setTimeout(resolve, 150));

      const iframe = readerArea.value?.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.scrollTo(0, 0);
        } catch (e) {
          // Cross-origin restriction, ignore
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);

      try {
        const spineItem = book.spine.get(href);
        if (spineItem) {
          await rendition.display(spineItem.index);
        }
      } catch (e) {
        console.error('Spine navigation failed:', e);

        try {
          const cleanHref = href.split('#')[0];
          await rendition.display(cleanHref);
        } catch (err) {
          console.error('All navigation methods failed:', err);
        }
      }
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeydown = (e) => {
    if (!rendition) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      prevSection();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextSection();
      e.preventDefault();
    }
  };

  /**
   * Handle window resize
   */
  const handleResize = () => {
    if (!rendition || !readerArea.value) return;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      try {
        rendition.resize(readerArea.value.clientWidth, readerArea.value.clientHeight);
      } catch {}
    });
  };

  /**
   * Toggle theme (dark/light)
   */
  const toggleTheme = () => {
    isDark.value = !isDark.value;
    if (isDark.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    applyFontTheme();
  };

  /**
   * Get current location CFI
   */
  const getCurrentCfi = () => {
    if (!rendition) return null;
    const location = rendition.currentLocation();
    return location?.start?.cfi || null;
  };

  /**
   * Save current progress
   */
  const saveProgress = () => {
    if (!rendition || !bookStore.currentBookId) return;
    const location = rendition.currentLocation();
    if (location?.start?.cfi) {
      bookStore.updateProgress(bookStore.currentBookId, location.start.cfi);
    }
  };

  // Watch for font changes
  watch([() => bookStore.fontFamily, () => bookStore.fontSize], () => {
    if (rendition) {
      applyFontTheme();
    }
  });

  // Setup resize listener
  onMounted(() => {
    window.addEventListener('resize', handleResize);
    if (isDark.value) {
      document.documentElement.classList.add('dark');
    }
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    destroyReader();
  });

  return {
    // State
    readerArea,
    toc,
    isDark,
    isLoading,
    book,
    rendition,

    // Methods
    initReader,
    destroyReader,
    applyFontTheme,
    applyFontThemeToView,
    nextSection,
    prevSection,
    jumpToCfi,
    navigateToChapter,
    handleKeydown,
    handleResize,
    toggleTheme,
    getCurrentCfi,
    saveProgress
  };
}

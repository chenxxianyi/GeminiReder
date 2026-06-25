<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useBookStore } from './stores/bookStore';
import ePub from 'epubjs';
import FontSettings from './components/FontSettings.vue';
import BookCard from './components/BookCard.vue';
import BookmarkPanel from './components/BookmarkPanel.vue';
import TableOfContents from './components/TableOfContents.vue';
import ArticleWriterPanel from './components/ArticleWriterPanel.vue';
import {
  Menu,
  Plus,
  Search,
  MoreVertical,
  Settings,
  Box,
  Sparkles,
  Send,
  Mic,
  Image as ImageIcon,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Copy,
  X,
  BookOpen,
  Sun,
  Moon
} from 'lucide-vue-next';

const bookStore = useBookStore();
const fileInput = ref(null);
const readerArea = ref(null);
const fakeInput = ref('');
const showSidebar = ref(true);
const showFontSettings = ref(false);
const showTOC = ref(false);
const showSearch = ref(false);
const showLibrary = ref(false);
const showBookmarks = ref(false);
const showBossMode = ref(false);
const showArticleWriter = ref(false); // Modal editor
const showArticleCanvas = ref(false); // Inline article view
const searchQuery = ref('');
const searchResults = ref([]);
const isSearching = ref(false);
const toc = ref([]);
const isDark = ref(true);
const articleSaveMessage = ref('');

let book = null;
let rendition = null;
let articleSaveTimer = 0;

const prevSection = () => {
  if (rendition) {
    rendition.prev();
  }
};

const nextSection = () => {
  if (rendition) {
    rendition.next();
  }
};

const setArticleMessage = (message) => {
  articleSaveMessage.value = message;
  if (articleSaveTimer) {
    clearTimeout(articleSaveTimer);
  }
  articleSaveTimer = window.setTimeout(() => {
    articleSaveMessage.value = '';
  }, 1500);
};

const ensureArticleSelected = () => {
  if (bookStore.currentArticleId) {
    const existing = bookStore.getArticleById(bookStore.currentArticleId);
    if (existing) return existing;
  }

  if (bookStore.articles.length > 0) {
    const first = bookStore.articles[0];
    bookStore.setCurrentArticle(first.id);
    return first;
  }

  return bookStore.createArticle({
    title: 'New Article',
    content: ''
  });
};

const openArticleWriter = () => {
  showBossMode.value = false;
  showArticleWriter.value = true;
  ensureArticleSelected();
};

const toggleArticleCanvas = () => {
  showBossMode.value = false;
  showArticleCanvas.value = !showArticleCanvas.value;
  if (showArticleCanvas.value) {
    ensureArticleSelected();
  }
};

const closeArticleWriter = () => {
  showArticleWriter.value = false;
};

const handleCreateArticle = () => {
  const article = bookStore.createArticle({
    title: `New Article ${bookStore.articles.length + 1}`,
    content: ''
  });
  bookStore.setCurrentArticle(article.id);
};

const handleSelectArticle = (id) => {
  bookStore.setCurrentArticle(id);
};

const handleUpdateArticleTitle = ({ id, title }) => {
  bookStore.updateArticle(id, { title });
};

const handleUpdateArticleContent = ({ id, content }) => {
  bookStore.updateArticle(id, { content });
};

const handleSaveArticle = (id = bookStore.currentArticleId) => {
  if (!id) return;
  const saved = bookStore.saveArticle(id);
  if (saved) {
    setArticleMessage('Saved');
  }
};

const handleDeleteArticle = (id) => {
  bookStore.removeArticle(id);
};

const handleArticleCanvasInput = (event) => {
  const content = event.target.innerText;
  if (bookStore.currentArticleId) {
    bookStore.updateArticle(bookStore.currentArticleId, { content });
  }
};

const appendInputToArticle = () => {
  const content = fakeInput.value.trim();
  if (!content) return;

  const article = ensureArticleSelected();
  const nextContent = article.content ? `${article.content}\n\n${content}` : content;
  bookStore.updateArticle(article.id, { content: nextContent });
  fakeInput.value = '';
  setArticleMessage('Added to draft');
};

const handleInputSubmit = () => {
  if (!fakeInput.value.trim()) return;

  if (showArticleWriter.value || showArticleCanvas.value) {
    appendInputToArticle();
    return;
  }

  if (rendition) {
    rendition.next();
  }
  fakeInput.value = '';
};

const handleInputKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleInputSubmit();
  }
};

const isTypingTarget = (target) => {
  if (!target || !target.tagName) return false;
  const tag = target.tagName.toUpperCase();
  return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

const initReader = async () => {
  if (!bookStore.currentBookId || !readerArea.value) return;

  if (book) {
    book.destroy();
    book = null;
    rendition = null;
    if (readerArea.value) readerArea.value.innerHTML = '';
  }

  const bookData = await bookStore.getBookData(bookStore.currentBookId);
  if (!bookData) return;

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
        // Force apply styles to iframe
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
  }
};

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
  const scrollThumb = isDark.value ? 'rgba(196, 199, 197, 0.22)' : 'rgba(95, 99, 104, 0.28)';
  const scrollThumbHover = isDark.value ? 'rgba(196, 199, 197, 0.35)' : 'rgba(95, 99, 104, 0.45)';

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
    /* Hide scrollbar for Epub iframe internal */
    ::-webkit-scrollbar {
      display: none;
    }
  `;
  head.appendChild(style);
};

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
  
  // Dynamic colors based on theme
  const bgColor = isDark.value ? '#131314' : '#ffffff';
  const textColor = isDark.value ? '#e3e3e3' : '#1f1f1f';
  const headingColor = isDark.value ? '#a8c7fa' : '#1b6ef3';
  const borderColor = isDark.value ? '#444746' : '#e0e3e1';
  const scrollThumb = isDark.value ? 'rgba(196, 199, 197, 0.22)' : 'rgba(95, 99, 104, 0.28)';
  const scrollThumbHover = isDark.value ? 'rgba(196, 199, 197, 0.35)' : 'rgba(95, 99, 104, 0.45)';
  
  // Revert to default theme for simplicity and stability
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

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (file && file.name.endsWith('.epub')) {
    await bookStore.addBook(file);
    const newBook = bookStore.books[bookStore.books.length - 1];
    selectBook(newBook.id);
  }
};

const selectBook = (id) => {
  bookStore.setCurrentBook(id);
  showTOC.value = false; // 切换书籍时关闭目录面板
  initReader();
};

const deleteBook = async (id, event) => {
  if (event) event.stopPropagation();
  await bookStore.removeBook(id);
};

const addBookmark = () => {
  if (!rendition || !bookStore.currentBookId) return;
  
  const currentLocation = rendition.currentLocation();
  if (currentLocation && currentLocation.start) {
    const cfi = currentLocation.start.cfi;
    const label = prompt('请输入书签名称：', `书签 ${new Date().toLocaleString('zh-CN')}`);
    
    if (label !== null && label.trim()) {
      bookStore.addBookmark(bookStore.currentBookId, cfi, label.trim());
      alert('书签添加成功！');
    }
  }
};

const jumpToBookmark = (cfi) => {
  if (rendition && cfi) {
    rendition.display(cfi);
  }
};

const navigateToChapter = async (href) => {
  if (!rendition || !href || !book) return;
  
  try {
    showTOC.value = false;
    await rendition.display(href);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const iframe = readerArea.value?.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.scrollTo(0, 0);
      } catch (e) {
        // 跨域限制，忽略
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

const handleTOCClick = async (href) => {
  if (rendition) {
    await rendition.display(href);
    showTOC.value = false;
  }
};

const handleLibraryBookClick = (id) => {
  selectBook(id);
  showLibrary.value = false;
};

const handleSearch = async () => {
  if (!book || !searchQuery.value.trim()) return;
  
  isSearching.value = true;
  searchResults.value = [];
  
  try {
    const results = await book.spine.spineItems.reduce(async (acc, item) => {
      const accumulated = await acc;
      const doc = await item.load(book.load.bind(book));
      const text = doc.body.textContent;
      
      if (text.includes(searchQuery.value)) {
        accumulated.push({
          cfi: item.cfiBase,
          excerpt: text.substring(0, 200)
        });
      }
      
      return accumulated;
    }, Promise.resolve([]));
    
    searchResults.value = results;
  } catch (error) {
    console.error('Search error:', error);
  } finally {
    isSearching.value = false;
  }
};

const handleKeydown = async (e) => {
  // Boss Key (Ctrl+B)
  if (e.ctrlKey && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    e.stopPropagation();
    
    // Save current progress before switching to boss mode
    if (!showBossMode.value && rendition) {
      const location = rendition.currentLocation();
      if (location && location.start && location.start.cfi) {
        bookStore.updateProgress(bookStore.currentBookId, location.start.cfi);
      }
    }

    // Toggle Boss Mode
    showBossMode.value = !showBossMode.value;
    
    if (!showBossMode.value) {
      // Switching back to Reader Mode
      setTimeout(async () => {
         // We don't need to re-init reader with v-show, but we might need to refresh view
         if (rendition) {
            // Restore position
            const currentBookObj = bookStore.books.find(b => b.id === bookStore.currentBookId);
            if (currentBookObj && currentBookObj.cfi) {
               await rendition.display(currentBookObj.cfi);
            } else {
               // Fallback if no CFI
               const location = rendition.currentLocation();
               if (location && location.start) {
                  await rendition.display(location.start.cfi);
               }
            }
         }
      }, 50);
    }
    return;
  }
  
  if (showBossMode.value) return; // Disable other keys in boss mode
  if (isTypingTarget(e.target)) return;

  // Forward arrow keys to rendition if event came from main window
  if (rendition && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
     // Let epub.js handle navigation or implement custom navigation
     if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevSection();
     if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextSection();
     e.preventDefault();
  }

  if (e.key === 'Enter' && rendition) {
    e.preventDefault();
    rendition.next();
    fakeInput.value = ''; 
  } else if (e.key === 'ArrowUp' && rendition) {
    e.preventDefault();
    rendition.prev();
  }
};

const handleFontApply = () => {
  if (rendition) {
    applyFontTheme();
  }
};

watch([() => bookStore.fontFamily, () => bookStore.fontSize], () => {
  if (rendition) {
    applyFontTheme();
  }
});

const toggleTheme = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  applyFontTheme();
};

let resizeRaf = 0;
const handleResize = () => {
  if (!rendition || !readerArea.value) return;
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    try {
      rendition.resize(readerArea.value.clientWidth, readerArea.value.clientHeight);
    } catch {}
  });
};

onMounted(async () => {
  // Init theme
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  }
  
  await bookStore.init();
  if (bookStore.currentBookId) {
    initReader();
  }
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
  if (articleSaveTimer) {
    clearTimeout(articleSaveTimer);
  }
});

</script>

<template>
  <div class="flex h-screen w-screen bg-gem-bg text-gem-text-primary font-sans overflow-hidden">
    
    <div v-if="showSidebar" class="flex flex-col w-[280px] bg-gem-sidebar flex-shrink-0 transition-all duration-300 select-none">
      <!-- Top Section: Logo & New Chat -->
      <div class="flex items-center justify-between px-4 pt-3 pb-2">
        <div class="flex items-center space-x-2">
          <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" class="w-6 h-6" />
          <span class="text-lg font-medium text-gem-text-primary">Gemini</span>
        </div>
        <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gem-hover transition-colors" title="新对话" @click="fileInput.click()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="text-gem-text-secondary">
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <input type="file" ref="fileInput" @change="handleFileUpload" accept=".epub" class="hidden" />
      </div>

      <!-- New Chat Button -->
      <div class="px-3 mb-2">
        <button
          @click="fileInput.click()"
          class="flex items-center space-x-3 text-gem-text-secondary hover:text-gem-text-primary px-4 py-3 rounded-full transition-colors w-full"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 text-gem-text-secondary">
            <path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="text-sm">发起新对话</span>
        </button>
      </div>

      <!-- Search Bar -->
      <div class="px-3 mb-2">
        <div @click="showTOC = true" class="flex items-center px-4 py-2.5 rounded-full border border-gem-border hover:border-gem-text-muted cursor-pointer transition-colors">
          <Search :size="18" class="text-gem-text-secondary mr-3 flex-shrink-0" />
          <span class="text-sm text-gem-text-muted flex-1">搜索对话内容</span>
          <span class="text-[11px] text-gem-text-muted bg-gem-hover px-1.5 py-0.5 rounded font-mono">Ctrl+Shift+K</span>
        </div>
      </div>

      <!-- Library Button -->
      <div class="px-3 mb-3">
        <div @click="showLibrary = true" class="flex items-center px-4 py-2.5 rounded-full hover:bg-gem-hover cursor-pointer transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-gem-text-secondary mr-3 flex-shrink-0">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <span class="text-sm text-gem-text-primary">库</span>
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-2">
        <!-- Notebook Section -->
        <div class="mb-4">
          <div class="px-4 py-1.5 text-xs text-gem-text-muted font-medium uppercase tracking-wider">笔记本</div>
          <a
            href="https://zh.z-lib.fm/"
            target="_blank"
            rel="noopener noreferrer"
            class="flex w-full items-center px-4 py-2.5 text-gem-text-primary hover:bg-gem-hover rounded-full cursor-pointer transition-colors"
            title="点击添加新的会话"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-gem-text-secondary mr-3 flex-shrink-0">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="text-sm">点击添加新的会话</span>
          </a>
        </div>

        <!-- Recent Section -->
        <div class="mb-4">
          <div class="px-4 py-1.5 text-xs text-gem-text-muted font-medium uppercase tracking-wider">最近</div>
          <div class="mt-1 space-y-0.5">
            <div
              v-for="book in bookStore.books"
              :key="book.id"
              @click="selectBook(book.id)"
              class="flex items-center px-4 py-2.5 rounded-full cursor-pointer group transition-colors text-sm truncate"
              :class="bookStore.currentBookId === book.id ? 'bg-[#004a77] text-[#c2e7ff]' : 'text-gem-text-secondary hover:bg-gem-hover'"
            >
              <span class="truncate flex-1">{{ book.fakeTitle }}</span>
              <div v-if="bookStore.currentBookId !== book.id" class="ml-2 hidden group-hover:flex items-center flex-shrink-0">
                <MoreVertical :size="14" class="text-gem-text-muted hover:text-gem-text-primary" @click.stop="deleteBook(book.id, $event)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom User Section -->
      <div class="border-t border-gem-border mx-3 my-2"></div>
      <div class="flex items-center justify-between px-3 pb-3 pt-1">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-sm text-white font-medium flex-shrink-0">
            X
          </div>
          <div class="flex flex-col">
            <span class="text-sm text-gem-text-primary font-medium leading-tight">xianyi chen</span>
            <span class="text-xs text-gem-text-muted leading-tight">Pro</span>
          </div>
        </div>
        <button @click="showFontSettings = true" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gem-hover transition-colors" title="设置">
          <Settings :size="20" class="text-gem-text-secondary" />
        </button>
      </div>
    </div>

    <div class="flex-1 flex flex-col h-full relative z-0">
      
      <div class="flex items-center justify-between px-5 py-3 flex-shrink-0">
        <div class="flex items-center">
          <Menu v-if="!showSidebar" :size="24" class="text-gem-text-secondary cursor-pointer hover:text-gem-text-primary mr-4" @click="showSidebar = !showSidebar" />
          <span class="text-xl font-medium text-gem-text-primary tracking-tight mr-2">Gemini Enterprise</span>
          <span class="bg-gem-badge text-gem-text-muted text-[10px] px-1.5 py-0.5 rounded font-medium">Business 版</span>
        </div>
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2 text-gem-text-secondary bg-gem-surface hover:bg-gem-hover px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
            <div class="w-6 h-6 rounded-full bg-purple-900 flex items-center justify-center text-xs text-white">
              T
            </div>
            <span class="text-sm font-medium">oo566's Team</span>
            <span class="text-xs">▼</span>
          </div>
          <Sparkles :size="20" class="text-gem-text-secondary hover:text-white cursor-pointer" />
          <History :size="20" class="text-gem-text-secondary hover:text-white cursor-pointer" @click="showBookmarks = true" title="书签" />
          <HelpCircle :size="20" class="text-gem-text-secondary hover:text-gem-text-primary cursor-pointer" />
          <Settings :size="20" class="text-gem-text-secondary hover:text-gem-text-primary cursor-pointer" @click="showFontSettings = true" />
          
          <!-- Theme Toggle -->
          <div @click="toggleTheme" class="cursor-pointer text-gem-text-secondary hover:text-gem-text-primary transition-colors" :title="isDark ? '切换到浅色模式' : '切换到深色模式'">
             <Sun v-if="isDark" :size="20" />
             <Moon v-else :size="20" />
          </div>

          <div class="w-8 h-8 rounded-full bg-gray-500 cursor-pointer overflow-hidden border-2 border-transparent hover:border-gem-text-primary transition-colors">
             <img src="https://ui-avatars.com/api/?name=User&background=random" alt="User" />
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-y-auto pb-32 flex flex-col w-full relative">
        <div class="w-full pt-8 flex-1">
           <!-- Boss Mode Content -->
           <div v-show="showBossMode" class="w-full">
              <div class="max-w-[760px] mx-auto px-4 flex items-start space-x-4 animate-fade-in">
                 <div class="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden mt-1">
                    <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" class="w-full h-full" />
                 </div>
                 <div class="flex-1 min-w-0">
                    <div class="text-gem-text-primary text-[15px] leading-relaxed mb-4">
                       正在分析 Kubernetes 集群日志中的异常 pod 重启问题。根据提供的日志片段，初步判断是由于 OOMKilled (Out Of Memory) 导致的。
                    </div>
                    
                    <div class="bg-[#1e1e1e] rounded-lg border border-[#444746] overflow-hidden font-mono text-sm mb-4">
                       <div class="bg-[#2d2e2f] px-4 py-2 flex items-center justify-between border-b border-[#444746]">
                          <span class="text-xs text-gem-text-secondary">k8s-pod-logs.txt</span>
                          <div class="flex items-center space-x-2">
                             <span class="text-xs text-gem-text-muted">Python</span>
                             <Copy :size="14" class="text-gem-text-secondary cursor-pointer hover:text-white" />
                          </div>
                       </div>
                       <div class="p-4 text-gem-text-secondary overflow-x-auto">
                          <div class="text-green-400"># 分析内存使用情况</div>
                          <div><span class="text-purple-400">def</span> <span class="text-yellow-400">analyze_memory_usage</span>(pod_name, namespace):</div>
                          <div class="pl-4">metrics = client.CustomObjectsApi().list_namespaced_custom_object(</div>
                          <div class="pl-8"><span class="text-orange-400">"metrics.k8s.io"</span>, <span class="text-orange-400">"v1beta1"</span>, namespace, <span class="text-orange-400">"pods"</span></div>
                          <div class="pl-4">)</div>
                          <div class="pl-4"><span class="text-purple-400">for</span> item <span class="text-purple-400">in</span> metrics[<span class="text-orange-400">'items'</span>]:</div>
                          <div class="pl-8"><span class="text-purple-400">if</span> item[<span class="text-orange-400">'metadata'</span>][<span class="text-orange-400">'name'</span>] == pod_name:</div>
                          <div class="pl-12">usage = item[<span class="text-orange-400">'containers'</span>][0][<span class="text-orange-400">'usage'</span>][<span class="text-orange-400">'memory'</span>]</div>
                          <div class="pl-12"><span class="text-purple-400">return</span> <span class="text-blue-400">int</span>(usage.rstrip(<span class="text-orange-400">'Ki'</span>))</div>
                          <div class="pl-4"><span class="text-purple-400">return</span> <span class="text-blue-400">None</span></div>
                          <br>
                          <div class="text-gray-500"># 建议：增加资源限制或优化应用内存占用</div>
                          <div><span class="text-purple-400">print</span>(f<span class="text-orange-400">"建议将 {pod_name} 的内存限制上调至 512Mi"</span>)</div>
                       </div>
                    </div>
   
                    <div class="text-gem-text-primary text-[15px] leading-relaxed">
                       建议检查部署配置文件（Deployment YAML），将 `resources.limits.memory` 从当前的 256Mi 调整为 512Mi 或更高，以避免容器被系统强制终止。同时，可以使用上述脚本持续监控内存泄漏情况。
                    </div>
                    
                    <div class="flex items-center space-x-1 mt-3">
                       <button class="p-2 hover:bg-[#333537] rounded-full text-gem-text-secondary transition-colors">
                          <ThumbsUp :size="18" />
                       </button>
                       <button class="p-2 hover:bg-[#333537] rounded-full text-gem-text-secondary transition-colors">
                          <ThumbsDown :size="18" />
                       </button>
                       <button class="p-2 hover:bg-[#333537] rounded-full text-gem-text-secondary transition-colors">
                          <Copy :size="18" />
                       </button>
                       <button class="p-2 hover:bg-[#333537] rounded-full text-gem-text-secondary transition-colors">
                          <MoreVertical :size="18" />
                       </button>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Real Reader Content -->
           <div v-show="!showBossMode && !showArticleCanvas && bookStore.currentBookId" class="w-full">
              <div class="max-w-[760px] mx-auto px-4 flex items-start space-x-4">
                 <div class="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden mt-1">
                    <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" class="w-full h-full" />
                 </div>
                 
                 <div class="flex-1 min-w-0">
                    <div class="text-gem-text-primary text-[15px] leading-relaxed mb-2">
                       好的，这是关于该日志文件的详细分析：
                    </div>
                 </div>
              </div>

              <div class="w-full mt-2">
                 <div class="h-[calc(100vh-260px)] min-h-[360px] relative">
                    <div ref="readerArea" class="h-full w-full"></div>
                 </div>
              </div>

              <div class="max-w-[760px] mx-auto px-4 flex items-center space-x-1 mt-3">
                 <button class="p-2 hover:bg-gem-hover rounded-full text-gem-text-secondary transition-colors">
                    <ThumbsUp :size="18" />
                 </button>
                 <button class="p-2 hover:bg-gem-hover rounded-full text-gem-text-secondary transition-colors">
                    <ThumbsDown :size="18" />
                 </button>
                 <button class="p-2 hover:bg-gem-hover rounded-full text-gem-text-secondary transition-colors">
                    <Copy :size="18" />
                 </button>
                 <button class="p-2 hover:bg-gem-hover rounded-full text-gem-text-secondary transition-colors">
                    <MoreVertical :size="18" />
                 </button>
              </div>
           </div>

           <!-- Article Canvas Content -->
           <div v-show="!showBossMode && showArticleCanvas" class="w-full">
              <div class="max-w-[760px] mx-auto px-4 flex items-start space-x-4">
                 <div class="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden mt-1">
                    <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" class="w-full h-full" />
                 </div>
                 
                 <div class="flex-1 min-w-0">
                    <div 
                       class="text-gem-text-primary text-[15px] leading-relaxed mb-2 whitespace-pre-wrap font-sans outline-none focus:ring-1 focus:ring-gem-blue rounded p-1"
                       contenteditable="true"
                       @input="handleArticleCanvasInput"
                       spellcheck="false"
                    >
                       {{ bookStore.getArticleById(bookStore.currentArticleId)?.content || 'Start typing in the input box below to write your article...' }}
                    </div>
                 </div>
              </div>

              <div class="max-w-[760px] mx-auto px-4 flex items-center space-x-1 mt-3">
                 <button class="p-2 hover:bg-gem-hover rounded-full text-gem-text-secondary transition-colors" @click="openArticleWriter" title="Full Editor">
                    <Settings :size="18" />
                 </button>
                 <button class="p-2 hover:bg-gem-hover rounded-full text-gem-text-secondary transition-colors">
                    <ThumbsUp :size="18" />
                 </button>
                 <button class="p-2 hover:bg-gem-hover rounded-full text-gem-text-secondary transition-colors">
                    <Copy :size="18" />
                 </button>
              </div>
           </div>

           <!-- Empty State -->
           <div v-show="!showBossMode && !showArticleCanvas && !bookStore.currentBookId" class="h-full flex flex-col items-center justify-center text-center mt-20 opacity-50">
              <div class="w-16 h-16 mb-6">
                  <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" class="w-full h-full grayscale opacity-50" />
              </div>
              <h2 class="text-2xl font-medium text-gem-text-secondary mb-2">你好，User</h2>
              <p class="text-gem-text-muted">今天我可以帮你做些什么？</p>
           </div>
        </div>
      </div>

      <div class="absolute bottom-0 left-0 right-0 bg-gem-bg pt-2 pb-4 px-4 flex flex-col items-center z-10">
        <div class="w-full max-w-3xl relative">
           <div class="bg-gem-surface rounded-[28px] flex flex-col border border-transparent hover:border-gem-border transition-colors overflow-hidden">
              <div class="flex items-center px-4 py-3">
                 <button 
                    class="p-2 rounded-full text-gem-text-primary mr-3 transition-colors"
                    :class="showArticleCanvas ? 'bg-gem-blue-bg text-gem-blue' : 'bg-gem-hover'"
                    @click="toggleArticleCanvas"
                    title="Toggle Article Writer"
                 >
                    <Plus :size="18" />
                 </button>
                 <input 
                    v-model="fakeInput"
                    type="text" 
                    :placeholder="showArticleCanvas ? 'Input paragraph, press Enter to append' : 'Continue asking'" 
                    class="flex-1 bg-transparent border-none outline-none text-gem-text-primary text-base placeholder-gem-text-muted h-10 font-sans"
                    @keydown="handleInputKeydown"
                 />
                 <div class="flex items-center space-x-2 ml-2">
                    <button class="p-2 hover:bg-gem-hover rounded-full text-gem-text-secondary transition-colors" @click="openArticleWriter" title="Open article writer">
                       <ImageIcon :size="20" />
                    </button>
                    <button class="p-2 hover:bg-gem-hover rounded-full text-gem-text-secondary transition-colors">
                       <Mic :size="20" />
                    </button>
                    <button 
                       class="p-2 rounded-full transition-colors"
                       :class="fakeInput ? 'bg-gem-blue text-black hover:opacity-90' : 'text-gem-text-muted hover:bg-gem-hover'"
                       @click="handleInputSubmit"
                    >
                       <Send :size="18" />
                    </button>
                 </div>
              </div>
              <div class="px-4 pb-2 flex items-center justify-between">
                 <div class="flex items-center space-x-2 text-xs text-gem-text-muted cursor-pointer hover:text-gem-text-primary">
                    <div class="w-4 h-4 rounded border border-gem-text-muted flex items-center justify-center text-[10px]">P</div>
                    <span>已选 1 个，共 12 个</span>
                 </div>
                 <div class="flex items-center space-x-2 text-xs text-gem-text-muted cursor-pointer hover:text-gem-text-primary">
                    <span>3 Pro (预览)</span>
                    <span class="text-[10px]">▼</span>
                 </div>
              </div>
           </div>
           
           <div class="text-center text-[11px] text-gem-text-muted mt-3 mb-1">
             生成式 AI 展示的信息（包括与人有关的信息）可能不够准确，请仔细核查回答内容。
           </div>
        </div>
      </div>
    </div>
    
    <FontSettings :show="showFontSettings" @close="showFontSettings = false" @apply="handleFontApply" />

    <BookmarkPanel 
      :show="showBookmarks" 
      :bookId="bookStore.currentBookId" 
      @close="showBookmarks = false" 
      @jumpTo="jumpToBookmark"
      @addBookmark="addBookmark"
    />

    <TableOfContents
      :show="showTOC"
      :toc="toc"
      :bookTitle="bookStore.books.find(b => b.id === bookStore.currentBookId)?.title || ''"
      @close="showTOC = false"
      @navigate="navigateToChapter"
    />

    <ArticleWriterPanel
      :show="showArticleWriter"
      :articles="bookStore.articles"
      :activeArticleId="bookStore.currentArticleId"
      :saveMessage="articleSaveMessage"
      @close="closeArticleWriter"
      @create="handleCreateArticle"
      @select="handleSelectArticle"
      @delete="handleDeleteArticle"
      @updateTitle="handleUpdateArticleTitle"
      @updateContent="handleUpdateArticleContent"
      @save="handleSaveArticle"
    />

     <div v-if="showLibrary" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" @click.self="showLibrary = false">
       <div class="bg-gem-sidebar w-[800px] h-[80vh] shadow-xl rounded-2xl flex flex-col border border-gem-border overflow-hidden">
         <div class="p-6 border-b border-gem-border flex items-center justify-between">
           <h3 class="text-xl text-gem-text-primary font-medium flex items-center">
             <Box :size="24" class="mr-3 text-gem-blue" />
             我的书库
           </h3>
           <X :size="24" class="text-gem-text-secondary cursor-pointer hover:text-white" @click="showLibrary = false" />
         </div>
         
         <div class="flex-1 overflow-y-auto p-6">
            <div v-if="bookStore.books.length === 0" class="text-center text-gem-text-muted mt-20 flex flex-col items-center">
              <BookOpen :size="48" class="mb-4 opacity-50" />
              <p class="text-lg">暂无书籍</p>
              <button @click="fileInput.click()" class="mt-4 text-gem-blue hover:underline">点击上传 EPUB 电子书</button>
            </div>
            
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <BookCard 
                 v-for="book in bookStore.books" 
                 :key="book.id"
                 :book="book"
                 @click="handleLibraryBookClick"
                 @delete="deleteBook"
               />
             </div>
          </div>
        </div>
      </div>
  </div>
</template>

<style>
.epub-container {
    background-color: var(--gem-bg) !important;
    width: 100% !important;
}
.epub-view {
    width: 100% !important;
    margin: 0 !important;
}
.epub-container iframe {
    background-color: var(--gem-bg) !important;
    width: 100% !important;
}
</style>

import { defineStore } from 'pinia';
import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import { ref } from 'vue';
import ePub from 'epubjs';

// Initialize localForage
localforage.config({
  name: 'CodeReaderDB'
});

const FAKE_TITLES = [
  "Docker Container Logs",
  "Kubernetes Pod Status",
  "React Component Lifecycle",
  "Vue 3 Reactivity System",
  "Spring Boot Configuration",
  "Nginx Error Logs",
  "Webpack Build Output",
  "Git Commit History",
  "AWS Lambda Function Logs",
  "Database Migration Script",
  "Node.js Event Loop",
  "Redis Cache Miss",
  "GraphQL Schema Definition",
  "TypeScript Interface Declaration",
  "Rust Borrow Checker Error"
];

export const useBookStore = defineStore('book', () => {
  const books = ref([]);
  const currentBookId = ref(null);
  const articles = ref([]);
  const currentArticleId = ref(null);
  
  // Font settings
  const fontFamily = ref('Fira Code');
  const fontSize = ref(14);

  // Load books metadata from localStorage (or localForage if we store metadata there too)
  // For simplicity, we store metadata in localStorage (small data) and blobs in localForage (large data)
  const init = async () => {
    const storedBooks = localStorage.getItem('codereader_books');
    if (storedBooks) {
      books.value = JSON.parse(storedBooks);
    }
    const lastBookId = localStorage.getItem('codereader_current_book');
    if (lastBookId) {
      currentBookId.value = lastBookId;
    }
    
    // Load font settings
    const storedFont = localStorage.getItem('codereader_font_family');
    if (storedFont) {
      fontFamily.value = storedFont;
    }
    const storedSize = localStorage.getItem('codereader_font_size');
    if (storedSize) {
      fontSize.value = parseInt(storedSize);
    }

    const storedArticles = localStorage.getItem('codereader_articles');
    if (storedArticles) {
      try {
        const parsedArticles = JSON.parse(storedArticles);
        if (Array.isArray(parsedArticles)) {
          articles.value = parsedArticles.map(article => ({
            ...article,
            dirty: false
          }));
        }
      } catch (error) {
        console.error('Error parsing saved articles:', error);
      }
    }

    const lastArticleId = localStorage.getItem('codereader_current_article');
    if (lastArticleId && articles.value.some(article => article.id === lastArticleId)) {
      currentArticleId.value = lastArticleId;
    } else if (articles.value.length > 0) {
      currentArticleId.value = articles.value[0].id;
      localStorage.setItem('codereader_current_article', currentArticleId.value);
    }
  };

  const saveMetadata = () => {
    localStorage.setItem('codereader_books', JSON.stringify(books.value));
  };

  const saveArticleMetadata = () => {
    localStorage.setItem('codereader_articles', JSON.stringify(articles.value));
  };

  const getRandomFakeTitle = () => {
    const index = Math.floor(Math.random() * FAKE_TITLES.length);
    const suffix = Math.floor(Math.random() * 1000);
    return `${FAKE_TITLES[index]} #${suffix}`;
  };

  const addBook = async (file) => {
    const id = uuidv4();
    const fakeTitle = getRandomFakeTitle();
    
    // Store the binary data in localForage
    await localforage.setItem(`book_${id}`, file);

    let title = fakeTitle;
    let author = 'Unknown Author';
    let hasCover = false;

    try {
      // Parse metadata to get real title and cover
      const arrayBuffer = await file.arrayBuffer();
      const book = ePub(arrayBuffer);
      await book.ready;
      
      const metadata = await book.loaded.metadata;
      if (metadata && metadata.title) {
        title = metadata.title;
      }
      if (metadata && metadata.creator) {
        author = metadata.creator;
      }

      const coverUrl = await book.coverUrl();
      if (coverUrl) {
        const response = await fetch(coverUrl);
        const blob = await response.blob();
        await localforage.setItem(`cover_${id}`, blob);
        hasCover = true;
      }
    } catch (e) {
      console.error("Error extracting metadata:", e);
    }

    const newBook = {
      id,
      title,
      author,
      hasCover,
      fakeTitle,
      cfi: null, // Current reading position
      bookmarks: [], // Array of bookmarks
      addedAt: Date.now()
    };

    books.value.push(newBook);
    saveMetadata();
    return newBook;
  };

  const getBookData = async (id) => {
    return await localforage.getItem(`book_${id}`);
  };
  
  const getCover = async (id) => {
    const blob = await localforage.getItem(`cover_${id}`);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  };

  const setCurrentBook = (id) => {
    currentBookId.value = id;
    localStorage.setItem('codereader_current_book', id);
  };

  const updateProgress = (id, cfi) => {
    const book = books.value.find(b => b.id === id);
    if (book) {
      book.cfi = cfi;
      saveMetadata();
    }
  };

  const removeBook = async (id) => {
    books.value = books.value.filter(b => b.id !== id);
    saveMetadata();
    await localforage.removeItem(`book_${id}`);
    if (currentBookId.value === id) {
      currentBookId.value = null;
      localStorage.removeItem('codereader_current_book');
    }
  };

  const setFontFamily = (font) => {
    fontFamily.value = font;
    localStorage.setItem('codereader_font_family', font);
  };

  const setFontSize = (size) => {
    fontSize.value = size;
    localStorage.setItem('codereader_font_size', size.toString());
  };

  const addBookmark = (bookId, cfi, label = '') => {
    const book = books.value.find(b => b.id === bookId);
    if (book) {
      if (!book.bookmarks) {
        book.bookmarks = [];
      }
      const bookmark = {
        id: uuidv4(),
        cfi,
        label: label || `书签 ${book.bookmarks.length + 1}`,
        createdAt: Date.now()
      };
      book.bookmarks.push(bookmark);
      saveMetadata();
      return bookmark;
    }
    return null;
  };

  const removeBookmark = (bookId, bookmarkId) => {
    const book = books.value.find(b => b.id === bookId);
    if (book && book.bookmarks) {
      book.bookmarks = book.bookmarks.filter(bm => bm.id !== bookmarkId);
      saveMetadata();
    }
  };

  const updateBookmark = (bookId, bookmarkId, label) => {
    const book = books.value.find(b => b.id === bookId);
    if (book && book.bookmarks) {
      const bookmark = book.bookmarks.find(bm => bm.id === bookmarkId);
      if (bookmark) {
        bookmark.label = label;
        saveMetadata();
      }
    }
  };

  const getBookmarks = (bookId) => {
    const book = books.value.find(b => b.id === bookId);
    return book?.bookmarks || [];
  };

  const createArticle = ({ title = '', content = '' } = {}) => {
    const now = Date.now();
    const article = {
      id: uuidv4(),
      title: title.trim() || 'Untitled Article',
      content,
      createdAt: now,
      updatedAt: now,
      dirty: false
    };
    articles.value.unshift(article);
    currentArticleId.value = article.id;
    localStorage.setItem('codereader_current_article', article.id);
    saveArticleMetadata();
    return article;
  };

  const setCurrentArticle = (id) => {
    currentArticleId.value = id;
    if (id) {
      localStorage.setItem('codereader_current_article', id);
    } else {
      localStorage.removeItem('codereader_current_article');
    }
  };

  const getArticleById = (id) => {
    return articles.value.find(article => article.id === id) || null;
  };

  const updateArticle = (id, payload = {}, options = {}) => {
    const article = getArticleById(id);
    if (!article) return null;

    Object.assign(article, payload);
    article.title = (article.title || '').trim() || 'Untitled Article';
    article.updatedAt = Date.now();

    if (options.persist) {
      article.dirty = false;
      saveArticleMetadata();
    } else {
      article.dirty = true;
    }

    return article;
  };

  const saveArticle = (id) => {
    const article = getArticleById(id);
    if (!article) return null;
    article.title = (article.title || '').trim() || 'Untitled Article';
    article.updatedAt = Date.now();
    article.dirty = false;
    saveArticleMetadata();
    return article;
  };

  const removeArticle = (id) => {
    articles.value = articles.value.filter(article => article.id !== id);

    if (currentArticleId.value === id) {
      const nextArticle = articles.value[0];
      if (nextArticle) {
        setCurrentArticle(nextArticle.id);
      } else {
        setCurrentArticle(null);
      }
    }

    saveArticleMetadata();
  };

  return {
    books,
    currentBookId,
    articles,
    currentArticleId,
    fontFamily,
    fontSize,
    init,
    addBook,
    getBookData,
    getCover,
    setCurrentBook,
    updateProgress,
    removeBook,
    setFontFamily,
    setFontSize,
    addBookmark,
    removeBookmark,
    updateBookmark,
    getBookmarks,
    createArticle,
    setCurrentArticle,
    getArticleById,
    updateArticle,
    saveArticle,
    removeArticle
  };
});

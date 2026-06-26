import { defineStore } from 'pinia';
import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import { ref } from 'vue';
import ePub from 'epubjs';

localforage.config({
  name: 'CodeReaderDB'
});

const FAKE_TITLES = [
  'Repository Detail Page',
  'Request Entity Too Large',
  'File AI Tool Integration',
  'Kubernetes Pod Status',
  'Nginx Access Log Review',
  'Vue Component Refactor',
  'Database Migration Script',
  'TypeScript Interface Audit',
  'Redis Cache Warmup',
  'JWT Session Rotation',
  'Build Queue Diagnostics',
  'Worker Retry Strategy'
];

const FAKE_PROJECTS = [
  'NoteWeb',
  'ZCodeProject',
  'InfraOps',
  'ReaderBench',
  'ConsoleKit',
  'TaskAudit'
];

const FAKE_TYPES = [
  'Bug',
  'Feature',
  'Review',
  'Docs',
  'Audit',
  'Ops'
];

const STORAGE_KEYS = {
  books: 'codereader_books',
  currentBook: 'codereader_current_book',
  articles: 'codereader_articles',
  currentArticle: 'codereader_current_article',
  fontFamily: 'codereader_font_family',
  fontSize: 'codereader_font_size'
};

const hashString = (value = '') => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const pickStableValue = (items, seed, salt = '') => {
  const hash = hashString(`${seed}:${salt}`);
  return items[hash % items.length];
};

const buildAliasSeed = ({
  id = '',
  title = '',
  author = '',
  addedAt = 0,
  fileName = '',
  fileSize = 0
}) => {
  return [id, title, author, addedAt, fileName, fileSize].join('|');
};

const normalizeBookRecord = (book = {}, index = 0) => {
  const addedAt = book.addedAt || Date.now();
  const aliasSeed = book.aliasSeed || buildAliasSeed({
    id: book.id || `legacy-${index}`,
    title: book.title || '',
    author: book.author || '',
    addedAt,
    fileName: book.fileName || '',
    fileSize: book.fileSize || 0
  });

  return {
    ...book,
    title: book.title || 'Untitled EPUB',
    author: book.author || 'Unknown Author',
    fakeTitle: book.fakeTitle || pickStableValue(FAKE_TITLES, aliasSeed, 'title'),
    fakeProject: book.fakeProject || pickStableValue(FAKE_PROJECTS, aliasSeed, 'project'),
    fakeType: book.fakeType || pickStableValue(FAKE_TYPES, aliasSeed, 'type'),
    aliasSeed,
    bookmarks: Array.isArray(book.bookmarks) ? book.bookmarks : [],
    hasCover: Boolean(book.hasCover),
    cfi: book.cfi || null,
    addedAt,
    lastOpenedAt: book.lastOpenedAt || addedAt,
    fileName: book.fileName || '',
    fileSize: book.fileSize || 0
  };
};

export const useBookStore = defineStore('book', () => {
  const books = ref([]);
  const currentBookId = ref(null);
  const articles = ref([]);
  const currentArticleId = ref(null);
  const fontFamily = ref('Fira Code');
  const fontSize = ref(14);

  const saveMetadata = () => {
    localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(books.value));
  };

  const saveArticleMetadata = () => {
    localStorage.setItem(STORAGE_KEYS.articles, JSON.stringify(articles.value));
  };

  const init = async () => {
    const storedBooks = localStorage.getItem(STORAGE_KEYS.books);
    if (storedBooks) {
      try {
        const parsedBooks = JSON.parse(storedBooks);
        if (Array.isArray(parsedBooks)) {
          books.value = parsedBooks.map((book, index) => normalizeBookRecord(book, index));
        }
      } catch (error) {
        console.error('Error parsing saved books:', error);
      }
    }

    const lastBookId = localStorage.getItem(STORAGE_KEYS.currentBook);
    if (lastBookId) {
      currentBookId.value = lastBookId;
    }

    const storedFont = localStorage.getItem(STORAGE_KEYS.fontFamily);
    if (storedFont) {
      fontFamily.value = storedFont;
    }

    const storedSize = localStorage.getItem(STORAGE_KEYS.fontSize);
    if (storedSize) {
      fontSize.value = parseInt(storedSize, 10);
    }

    const storedArticles = localStorage.getItem(STORAGE_KEYS.articles);
    if (storedArticles) {
      try {
        const parsedArticles = JSON.parse(storedArticles);
        if (Array.isArray(parsedArticles)) {
          articles.value = parsedArticles.map((article) => ({
            ...article,
            dirty: false
          }));
        }
      } catch (error) {
        console.error('Error parsing saved articles:', error);
      }
    }

    const lastArticleId = localStorage.getItem(STORAGE_KEYS.currentArticle);
    if (lastArticleId && articles.value.some((article) => article.id === lastArticleId)) {
      currentArticleId.value = lastArticleId;
    } else if (articles.value.length > 0) {
      currentArticleId.value = articles.value[0].id;
      localStorage.setItem(STORAGE_KEYS.currentArticle, currentArticleId.value);
    }

    if (books.value.length > 0) {
      saveMetadata();
    }
  };

  const addBook = async (file) => {
    const id = uuidv4();
    const addedAt = Date.now();
    await localforage.setItem(`book_${id}`, file);

    let title = 'Untitled EPUB';
    let author = 'Unknown Author';
    let hasCover = false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const book = ePub(arrayBuffer);
      await book.ready;

      const metadata = await book.loaded.metadata;
      if (metadata?.title) {
        title = metadata.title;
      }
      if (metadata?.creator) {
        author = metadata.creator;
      }

      const coverUrl = await book.coverUrl();
      if (coverUrl) {
        const response = await fetch(coverUrl);
        const blob = await response.blob();
        await localforage.setItem(`cover_${id}`, blob);
        hasCover = true;
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
    }

    const aliasSeed = buildAliasSeed({
      id,
      title,
      author,
      addedAt,
      fileName: file.name,
      fileSize: file.size
    });

    const newBook = normalizeBookRecord({
      id,
      title,
      author,
      hasCover,
      aliasSeed,
      cfi: null,
      bookmarks: [],
      addedAt,
      lastOpenedAt: addedAt,
      fileName: file.name,
      fileSize: file.size
    });

    books.value.push(newBook);
    saveMetadata();
    return newBook;
  };

  const getBookData = async (id) => {
    return await localforage.getItem(`book_${id}`);
  };

  const getCover = async (id) => {
    const blob = await localforage.getItem(`cover_${id}`);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  };

  const setCurrentBook = (id) => {
    currentBookId.value = id;

    if (id) {
      localStorage.setItem(STORAGE_KEYS.currentBook, id);
      const book = books.value.find((entry) => entry.id === id);
      if (book) {
        book.lastOpenedAt = Date.now();
        saveMetadata();
      }
      return;
    }

    localStorage.removeItem(STORAGE_KEYS.currentBook);
  };

  const updateProgress = (id, cfi) => {
    const book = books.value.find((entry) => entry.id === id);
    if (!book) return;
    book.cfi = cfi;
    book.lastOpenedAt = Date.now();
    saveMetadata();
  };

  const removeBook = async (id) => {
    books.value = books.value.filter((entry) => entry.id !== id);
    saveMetadata();
    await localforage.removeItem(`book_${id}`);
    await localforage.removeItem(`cover_${id}`);

    if (currentBookId.value === id) {
      currentBookId.value = null;
      localStorage.removeItem(STORAGE_KEYS.currentBook);
    }
  };

  const setFontFamily = (font) => {
    fontFamily.value = font;
    localStorage.setItem(STORAGE_KEYS.fontFamily, font);
  };

  const setFontSize = (size) => {
    fontSize.value = size;
    localStorage.setItem(STORAGE_KEYS.fontSize, size.toString());
  };

  const addBookmark = (bookId, cfi, label = '') => {
    const book = books.value.find((entry) => entry.id === bookId);
    if (!book) return null;

    if (!Array.isArray(book.bookmarks)) {
      book.bookmarks = [];
    }

    const bookmark = {
      id: uuidv4(),
      cfi,
      label: label || `Pin ${book.bookmarks.length + 1}`,
      createdAt: Date.now()
    };

    book.bookmarks.push(bookmark);
    saveMetadata();
    return bookmark;
  };

  const removeBookmark = (bookId, bookmarkId) => {
    const book = books.value.find((entry) => entry.id === bookId);
    if (!book || !Array.isArray(book.bookmarks)) return;
    book.bookmarks = book.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId);
    saveMetadata();
  };

  const updateBookmark = (bookId, bookmarkId, label) => {
    const book = books.value.find((entry) => entry.id === bookId);
    if (!book || !Array.isArray(book.bookmarks)) return;

    const bookmark = book.bookmarks.find((entry) => entry.id === bookmarkId);
    if (!bookmark) return;

    bookmark.label = label;
    saveMetadata();
  };

  const getBookmarks = (bookId) => {
    const book = books.value.find((entry) => entry.id === bookId);
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
    localStorage.setItem(STORAGE_KEYS.currentArticle, article.id);
    saveArticleMetadata();
    return article;
  };

  const setCurrentArticle = (id) => {
    currentArticleId.value = id;
    if (id) {
      localStorage.setItem(STORAGE_KEYS.currentArticle, id);
      return;
    }
    localStorage.removeItem(STORAGE_KEYS.currentArticle);
  };

  const getArticleById = (id) => {
    return articles.value.find((article) => article.id === id) || null;
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
    articles.value = articles.value.filter((article) => article.id !== id);

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

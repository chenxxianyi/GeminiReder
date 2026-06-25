<script setup>
import { ref, computed } from 'vue';
import { useBookStore } from '../../stores/bookStore';
import {
  Search,
  Plus,
  Sparkles,
  ChevronDown,
  X,
  Terminal,
  FileText,
  Settings,
  HelpCircle,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode
} from 'lucide-vue-next';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  currentBookId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['select-book', 'open-search', 'toggle-collapsed', 'open-settings']);

const bookStore = useBookStore();
const expandedProjects = ref({});

// Toggle project expansion
const toggleProject = (projectName) => {
  expandedProjects.value[projectName] = !expandedProjects.value[projectName];
};

// Projects section - group books
const projects = computed(() => {
  const projectMap = {};
  bookStore.books.forEach((book) => {
    const projName = book.project || 'Default';
    if (!projectMap[projName]) {
      projectMap[projName] = [];
    }
    projectMap[projName].push(book);
  });
  return Object.entries(projectMap).map(([name, books]) => ({
    name,
    books,
    isExpanded: expandedProjects.value[name] !== false
  }));
});

// Book list items
const bookListItems = computed(() => {
  return bookStore.books.map(book => {
    const isActive = book.id === props.currentBookId;
    return {
      id: book.id,
      title: book.fakeTitle,
      isActive
    };
  });
});

const handleSelectBook = (bookId) => {
  emit('select-book', bookId);
};

const handleToggleCollapsed = () => {
  emit('toggle-collapsed');
};

const openSearch = () => {
  emit('open-search');
};

const openFontSettings = () => {
  emit('open-settings', 'font');
};

const openReadingSettings = () => {
  emit('open-settings', 'reading');
};
</script>

<template>
  <aside class="zcode-sidebar flex flex-col h-full bg-[var(--zc-sidebar)] transition-all duration-200" :class="{ 'w-0': collapsed }">
    <!-- Explorer Header -->
    <div class="flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--zc-text-dim)]">
      <span>Explorer</span>
      <div class="flex items-center space-x-1">
        <button class="zcode-btn !p-1" title="New File" @click="$emit('new-task')">
          <Plus :size="16" />
        </button>
        <button class="zcode-btn !p-1" title="Collapse All">
          <ChevronDown :size="16" />
        </button>
      </div>
    </div>

    <!-- Projects Tree -->
    <div class="flex-1 overflow-y-auto zcode-scroll">
      <!-- GEMINIREADER Section -->
      <div class="zcode-sidebar-section">
        <div class="zcode-sidebar-section-label flex items-center cursor-pointer" @click="toggleProject('GEMINIREADER')">
          <ChevronDown :size="12" class="mr-1 transition-transform" :class="{ 'rotate-0': expandedProjects['GEMINIREADER'] !== false, '-rotate-90': expandedProjects['GEMINIREADER'] === false }" />
          <span>GEMINIREADER</span>
        </div>

        <div v-show="expandedProjects['GEMINIREADER'] !== false" class="mt-1">
          <!-- node_modules -->
          <div class="zcode-sidebar-item pl-6">
            <ChevronRight :size="12" class="mr-1" />
            <Folder :size="14" class="mr-2 text-[var(--zc-success)]" />
            <span>node_modules</span>
          </div>

          <!-- src folder -->
          <div class="mt-1">
            <div class="zcode-sidebar-item pl-6" @click="toggleProject('src')">
              <ChevronDown :size="12" class="mr-1 transition-transform" />
              <FolderOpen :size="14" class="mr-2 text-[var(--zc-success)]" />
              <span>src</span>
            </div>

            <div v-show="expandedProjects['src'] !== false" class="mt-1">
              <!-- Books -->
              <div class="zcode-sidebar-item pl-10">
                <ChevronRight :size="12" class="mr-1" />
                <Folder :size="14" class="mr-2 text-[var(--zc-success)]" />
                <span>books</span>
              </div>

              <!-- Book items -->
              <div v-if="bookStore.books.length > 0" class="mt-1">
                <button
                  v-for="item in bookListItems"
                  :key="item.id"
                  class="zcode-sidebar-item pl-14"
                  :class="{ active: item.isActive }"
                  @click="handleSelectBook(item.id)"
                >
                  <FileCode :size="14" class="mr-2 text-[var(--zc-info)]" />
                  <span class="truncate">{{ item.title }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Other files -->
          <div class="zcode-sidebar-item pl-6 mt-1">
            <FileText :size="14" class="mr-2 text-[var(--zc-text-muted)]" />
            <span>package.json</span>
          </div>
          <div class="zcode-sidebar-item pl-6">
            <FileText :size="14" class="mr-2 text-[var(--zc-text-muted)]" />
            <span>vite.config.js</span>
          </div>
        </div>
      </div>

      <!-- Outline Section -->
      <div class="zcode-sidebar-section mt-2">
        <div class="zcode-sidebar-section-label flex items-center cursor-pointer">
          <ChevronDown :size="12" class="mr-1" />
          <span>OUTLINE</span>
        </div>
        <div class="px-4 py-2 text-xs text-[var(--zc-text-dim)]">
          No symbols found in this file.
        </div>
      </div>

      <!-- Timeline Section -->
      <div class="zcode-sidebar-section mt-2">
        <div class="zcode-sidebar-section-label flex items-center cursor-pointer">
          <ChevronRight :size="12" class="mr-1" />
          <span>TIMELINE</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="border-t border-[var(--zc-border-soft)] p-2">
      <div class="flex items-center space-x-1">
        <button class="zcode-btn flex-1 justify-start text-xs" @click="openSearch">
          <Search :size="14" class="mr-2" />
          <span class="text-[var(--zc-text-muted)]">Search (Ctrl+P)</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.zcode-sidebar {
  width: var(--zc-sidebar-w, 300px);
  min-width: var(--zc-sidebar-w, 300px);
}

.zcode-sidebar.w-0 {
  width: 0;
  min-width: 0;
  overflow: hidden;
}

.zcode-sidebar-section {
  user-select: none;
}

.zcode-sidebar-section-label {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--zc-text-dim);
  cursor: pointer;
}

.zcode-sidebar-section-label:hover {
  color: var(--zc-text-muted);
}

.zcode-sidebar-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 2px 8px 2px 20px;
  color: var(--zc-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  height: 22px;
  transition: background-color 0.1s ease;
}

.zcode-sidebar-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--zc-text);
}

.zcode-sidebar-item.active {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--zc-text);
}
</style>
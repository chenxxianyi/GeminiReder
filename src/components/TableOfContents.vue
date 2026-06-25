<script setup>
import { ref, computed, watch } from 'vue';
import { ChevronRight, ChevronDown, X, List } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean,
  toc: {
    type: Array,
    default: () => []
  },
  currentCfi: String,
  bookTitle: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'navigate']);

const expandedItems = ref(new Set());

// 当目录数据变化时，重置展开状态
watch(() => props.toc, (newToc, oldToc) => {
  // 只有当目录真正改变时才重置（避免同一本书重复重置）
  if (JSON.stringify(newToc) !== JSON.stringify(oldToc)) {
    expandedItems.value = new Set();
  }
}, { deep: true });

// 当面板打开时，确保使用最新的目录数据
watch(() => props.show, (isShown) => {
  if (isShown) {
    expandedItems.value = new Set();
  }
});

const toggleExpand = (id) => {
  if (expandedItems.value.has(id)) {
    expandedItems.value.delete(id);
  } else {
    expandedItems.value.add(id);
  }
};

const isExpanded = (id) => {
  return expandedItems.value.has(id);
};

const handleNavigate = (item) => {
  emit('navigate', item.href);
  emit('close');
};

const hasChildren = (item) => {
  return item.subitems && item.subitems.length > 0;
};
</script>

<template>
  <Transition name="slide">
    <div v-if="show" class="fixed top-0 right-0 h-full w-80 bg-gem-sidebar border-l border-gem-border shadow-2xl z-40 flex flex-col">
      <!-- 头部 -->
      <div class="flex flex-col px-4 py-3 border-b border-gem-border">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <List :size="20" class="text-gem-blue" />
            <h3 class="text-base font-medium text-gem-text-primary">目录</h3>
          </div>
          <button @click="emit('close')" class="p-1.5 hover:bg-gem-hover rounded-full transition-colors">
            <X :size="18" class="text-gem-text-secondary" />
          </button>
        </div>
        <div v-if="bookTitle" class="text-xs text-gem-text-muted truncate" :title="bookTitle">
          {{ bookTitle }}
        </div>
      </div>

      <!-- 目录列表 -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="toc.length === 0" class="flex flex-col items-center justify-center h-full text-center px-4">
          <List :size="48" class="text-gem-text-muted mb-3 opacity-30" />
          <p class="text-gem-text-secondary text-sm mb-1">暂无目录</p>
          <p class="text-gem-text-muted text-xs">此书籍没有目录信息</p>
        </div>

        <div v-else class="py-2">
          <TocItem
            v-for="(item, index) in toc"
            :key="index"
            :item="item"
            :level="0"
            :expanded="isExpanded(item.id || index)"
            @toggle="toggleExpand(item.id || index)"
            @navigate="handleNavigate"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
// TOC Item 递归组件
import { defineComponent, h } from 'vue';
import { ChevronRight, ChevronDown } from 'lucide-vue-next';

const TocItem = defineComponent({
  name: 'TocItem',
  props: {
    item: Object,
    level: Number,
    expanded: Boolean
  },
  emits: ['toggle', 'navigate'],
  setup(props, { emit }) {
    const hasChildren = props.item.subitems && props.item.subitems.length > 0;
    const paddingLeft = `${props.level * 16 + 12}px`;

    return () => h('div', { class: 'toc-item' }, [
      // 主项
      h('div', {
        class: 'flex items-center px-3 py-2 hover:bg-gem-hover cursor-pointer group transition-colors',
        style: { paddingLeft },
        onClick: () => {
          if (hasChildren) {
            emit('toggle');
          } else {
            emit('navigate', props.item);
          }
        }
      }, [
        // 展开/收起图标
        hasChildren && h('div', { class: 'mr-2 flex-shrink-0' }, [
          props.expanded 
            ? h(ChevronDown, { size: 16, class: 'text-gem-text-muted' })
            : h(ChevronRight, { size: 16, class: 'text-gem-text-muted' })
        ]),
        // 标题
        h('span', {
          class: 'text-sm text-gem-text-primary group-hover:text-gem-blue transition-colors flex-1 truncate',
          title: props.item.label
        }, props.item.label)
      ]),
      // 子项
      hasChildren && props.expanded && h('div', { class: 'toc-children' },
        props.item.subitems.map((subitem, index) =>
          h(TocItem, {
            key: index,
            item: subitem,
            level: props.level + 1,
            expanded: false,
            onToggle: () => emit('toggle', subitem.id || `${props.item.id}-${index}`),
            onNavigate: (item) => emit('navigate', item)
          })
        )
      )
    ]);
  }
});

export { TocItem };
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>

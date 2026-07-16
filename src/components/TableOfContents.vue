<script setup>
import { nextTick, ref, watch } from 'vue';
import { X, Search } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean,
  toc: {
    type: Array,
    default: () => []
  },
  currentCfi: String,
  activeHref: {
    type: String,
    default: ''
  },
  bookTitle: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'navigate']);

const expandedItems = ref(new Set());
const tocScrollEl = ref(null);

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

const isHrefMatch = (leftHref = '', rightHref = '') => {
  const left = normalizeHref(leftHref);
  const right = normalizeHref(rightHref);
  if (!left || !right) return false;
  return left === right || getHrefTail(left) === getHrefTail(right);
};

const itemContainsHref = (item, activeHref) => {
  if (!activeHref) return false;
  if (isHrefMatch(item.href, activeHref)) return true;
  return (item.subitems || []).some((subitem) => itemContainsHref(subitem, activeHref));
};

const collectActiveParentKeys = (items = [], activeHref = '', parentKey = '') => {
  const keys = [];

  items.forEach((item, index) => {
    const itemKey = parentKey
      ? `${parentKey}/${item.id || item.href || `toc-${index}`}`
      : getTocItemKey(item, index);

    if ((item.subitems || []).some((subitem) => itemContainsHref(subitem, activeHref))) {
      keys.push(itemKey);
      keys.push(...collectActiveParentKeys(item.subitems || [], activeHref, itemKey));
    }
  });

  return keys;
};

const scrollActiveItemIntoView = async () => {
  await nextTick();
  const activeEl = tocScrollEl.value?.querySelector('[data-toc-active="true"]');
  activeEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
};

const revealActiveItem = async () => {
  if (!props.activeHref) return;
  expandedItems.value = new Set([
    ...expandedItems.value,
    ...collectActiveParentKeys(props.toc, props.activeHref)
  ]);
  await scrollActiveItemIntoView();
};

watch(
  () => props.toc,
  (nextToc, prevToc) => {
    if (JSON.stringify(nextToc) !== JSON.stringify(prevToc)) {
      expandedItems.value = new Set();
    }
  },
  { deep: true }
);

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      expandedItems.value = new Set(collectActiveParentKeys(props.toc, props.activeHref));
      scrollActiveItemIntoView();
    }
  }
);

watch(
  () => props.activeHref,
  () => {
    if (props.show) {
      revealActiveItem();
    }
  }
);

const toggleExpand = (id) => {
  const nextExpandedItems = new Set(expandedItems.value);

  if (nextExpandedItems.has(id)) {
    nextExpandedItems.delete(id);
  } else {
    nextExpandedItems.add(id);
  }

  expandedItems.value = nextExpandedItems;
};

const getTocItemKey = (item, index) => item.id || item.href || `toc-${index}`;

const handleNavigate = (item) => {
  emit('navigate', item.href);
  emit('close');
};
</script>

<template>
  <Transition name="slide">
    <div
      v-if="show"
      class="fixed top-0 right-0 z-40 flex h-full w-80 flex-col border-l border-gem-border bg-gem-sidebar shadow-2xl"
    >
      <div class="flex flex-col border-b border-gem-border px-4 py-3">
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Search :size="20" class="text-gem-blue" />
            <h3 class="text-base font-medium text-gem-text-primary">Search / Symbol</h3>
          </div>
          <button
            class="rounded-full p-1.5 transition-colors hover:bg-gem-hover"
            @click="emit('close')"
          >
            <X :size="18" class="text-gem-text-secondary" />
          </button>
        </div>
        <div v-if="bookTitle" class="truncate text-xs text-gem-text-muted" :title="bookTitle">
          Indexed task outline
        </div>
      </div>

      <div ref="tocScrollEl" class="flex-1 overflow-y-auto">
        <div
          v-if="toc.length === 0"
          class="flex h-full flex-col items-center justify-center px-4 text-center"
        >
          <Search :size="48" class="mb-3 opacity-30 text-gem-text-muted" />
          <p class="mb-1 text-sm text-gem-text-secondary">No indexed symbols</p>
          <p class="text-xs text-gem-text-muted">Import a task file to populate this panel.</p>
        </div>

        <div v-else class="py-2">
          <TocItem
            v-for="(item, index) in toc"
            :key="item.id || index"
            :item="item"
            :level="0"
            :item-key="getTocItemKey(item, index)"
            :expanded-items="expandedItems"
            :active-href="activeHref"
            @toggle="toggleExpand"
            @navigate="handleNavigate"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { defineComponent, h } from 'vue';
import { ChevronRight, ChevronDown } from 'lucide-vue-next';

const TocItem = defineComponent({
  name: 'TocItem',
  props: {
    item: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      required: true
    },
    expandedItems: {
      type: Object,
      required: true
    },
    itemKey: {
      type: String,
      required: true
    },
    activeHref: {
      type: String,
      default: ''
    }
  },
  emits: ['toggle', 'navigate'],
  setup(props, { emit }) {
    const normalizeItemHref = (href = '') => {
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

    const getItemHrefTail = (href = '') => normalizeItemHref(href).split('/').filter(Boolean).pop() || '';
    const isItemActive = (href = '') => {
      const itemHref = normalizeItemHref(href);
      const activeHref = normalizeItemHref(props.activeHref);
      if (!itemHref || !activeHref) return false;
      return itemHref === activeHref || getItemHrefTail(itemHref) === getItemHrefTail(activeHref);
    };

    const hasActiveDescendant = (item) => {
      return (item.subitems || []).some((subitem) => isItemActive(subitem.href) || hasActiveDescendant(subitem));
    };

    return () =>
      {
        const subitems = props.item.subitems || [];
        const hasChildren = subitems.length > 0;
        const isExpanded = props.expandedItems.has(props.itemKey);
        const isActive = isItemActive(props.item.href);
        const isActiveParent = !isActive && hasActiveDescendant(props.item);
        const paddingLeft = `${props.level * 16 + 12}px`;

        return h('div', { class: 'toc-item' }, [
          h(
            'div',
            {
              class: [
                'toc-row group flex cursor-pointer items-center px-3 py-2 transition-colors hover:bg-gem-hover',
                isActive ? 'toc-row-active' : '',
                isActiveParent ? 'toc-row-parent-active' : ''
              ],
              'data-toc-active': isActive ? 'true' : undefined,
              style: { paddingLeft },
              onClick: () => {
                if (hasChildren) {
                  emit('toggle', props.itemKey);
                  return;
                }

                emit('navigate', props.item);
              }
            },
            [
              hasChildren &&
                h('div', { class: 'mr-2 flex-shrink-0' }, [
                  isExpanded
                    ? h(ChevronDown, { size: 16, class: 'text-gem-text-muted' })
                    : h(ChevronRight, { size: 16, class: 'text-gem-text-muted' })
                ]),
              h(
                'span',
                {
                  class: [
                    'flex-1 truncate text-sm transition-colors group-hover:text-gem-blue',
                    isActive ? 'font-semibold text-gem-blue' : 'text-gem-text-primary',
                    isActiveParent ? 'text-gem-text-primary' : ''
                  ],
                  title: props.item.label
                },
                props.item.label
              )
            ]
          ),
          hasChildren &&
            isExpanded &&
            h(
              'div',
              { class: 'toc-children' },
              subitems.map((subitem, index) => {
                const subitemKey = `${props.itemKey}/${subitem.id || subitem.href || `toc-${index}`}`;

                return h(TocItem, {
                  key: subitemKey,
                  item: subitem,
                  level: props.level + 1,
                  itemKey: subitemKey,
                  expandedItems: props.expandedItems,
                  activeHref: props.activeHref,
                  onToggle: (id) => emit('toggle', id),
                  onNavigate: (item) => emit('navigate', item)
                });
              })
            )
        ]);
      };
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

.toc-row {
  position: relative;
}

.toc-row-active {
  background: rgba(66, 133, 244, 0.14);
}

.toc-row-active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: #4285f4;
}

.toc-row-parent-active {
  background: rgba(255, 255, 255, 0.04);
}
</style>

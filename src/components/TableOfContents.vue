<script setup>
import { ref, watch } from 'vue';
import { ChevronRight, ChevronDown, X, Search } from 'lucide-vue-next';

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
      expandedItems.value = new Set();
    }
  }
);

const toggleExpand = (id) => {
  if (expandedItems.value.has(id)) {
    expandedItems.value.delete(id);
    return;
  }
  expandedItems.value.add(id);
};

const isExpanded = (id) => {
  return expandedItems.value.has(id);
};

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

      <div class="flex-1 overflow-y-auto">
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
    expanded: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle', 'navigate'],
  setup(props, { emit }) {
    const hasChildren = props.item.subitems && props.item.subitems.length > 0;
    const paddingLeft = `${props.level * 16 + 12}px`;

    return () =>
      h('div', { class: 'toc-item' }, [
        h(
          'div',
          {
            class: 'group flex cursor-pointer items-center px-3 py-2 transition-colors hover:bg-gem-hover',
            style: { paddingLeft },
            onClick: () => {
              if (hasChildren) {
                emit('navigate', props.item);
                emit('toggle');
                return;
              }
              emit('navigate', props.item);
            }
          },
          [
            hasChildren &&
              h('div', { class: 'mr-2 flex-shrink-0' }, [
                props.expanded
                  ? h(ChevronDown, { size: 16, class: 'text-gem-text-muted' })
                  : h(ChevronRight, { size: 16, class: 'text-gem-text-muted' })
              ]),
            h(
              'span',
              {
                class: 'flex-1 truncate text-sm text-gem-text-primary transition-colors group-hover:text-gem-blue',
                title: props.item.label
              },
              props.item.label
            )
          ]
        ),
        hasChildren &&
          props.expanded &&
          h(
            'div',
            { class: 'toc-children' },
            props.item.subitems.map((subitem, index) =>
              h(TocItem, {
                key: subitem.id || `${props.item.id}-${index}`,
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

import { ref, computed, type Ref } from "vue";

/**
 * 通用待办事项分页 composable
 * 消除多个页面中重复的 TODO 分页逻辑
 */
export function useTodoPagination<T>(items: Ref<T[]>, pageSize = 3) {
  const page = ref(1);

  const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize)));

  const paginatedItems = computed<T[]>(() => {
    const start = (page.value - 1) * pageSize;
    return items.value.slice(start, start + pageSize);
  });

  const prev = () => {
    if (page.value > 1) page.value--;
  };

  const next = () => {
    if (page.value < totalPages.value) page.value++;
  };

  const resetPage = () => {
    page.value = 1;
  };

  return { page, totalPages, paginatedItems, prev, next, resetPage };
}

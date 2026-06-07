import { computed, toValue, type MaybeRefOrGetter } from "vue";

/**
 * 通用分页页码计算 composable
 * 消除 10+ 个页面中重复的页码计算逻辑
 *
 * @param totalItems 数据总条数（支持 Ref、computed、getter 函数）
 * @param pageSize 每页条数（支持 Ref、computed、getter 函数）
 * @param currentPage 当前页码（支持 Ref、computed、getter 函数）
 * @returns { totalPages, pageNumbers }
 */
export function usePageNumbers(
  totalItems: MaybeRefOrGetter<number>,
  pageSize: MaybeRefOrGetter<number>,
  currentPage: MaybeRefOrGetter<number>,
) {
  const totalPages = computed(() => Math.ceil(toValue(totalItems) / toValue(pageSize)) || 1);

  const pageNumbers = computed<(number | string)[]>(() => {
    const total = totalPages.value;
    const current = toValue(currentPage);
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, "...", total];
    if (current >= total - 2) return [1, "...", total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  });

  return { totalPages, pageNumbers };
}

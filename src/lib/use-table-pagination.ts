"use client";

import { useMemo, useState } from "react";

export function useTablePagination<T>({
  items,
  pageSize = 5,
  resetKey,
}: {
  items: T[];
  pageSize?: number;
  resetKey?: string | number;
}) {
  const [state, setState] = useState(() => ({
    currentPage: 1,
    resetKey,
  }));

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const currentPage = Math.min(
    state.resetKey === resetKey ? state.currentPage : 1,
    totalPages,
  );

  const setCurrentPage = (page: number | ((previous: number) => number)) => {
    setState((previous) => {
      const previousPage =
        previous.resetKey === resetKey ? previous.currentPage : 1;
      const resolvedPage =
        typeof page === "function" ? page(previousPage) : page;

      return {
        currentPage: Math.min(Math.max(resolvedPage, 1), totalPages),
        resetKey,
      };
    });
  };

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [currentPage, items, pageSize]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem =
    totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  return {
    currentPage,
    setCurrentPage,
    totalItems,
    totalPages,
    startItem,
    endItem,
    paginatedItems,
  };
}

'use client';

import { useRef, useCallback, useEffect } from 'react';

interface UseInfiniteScrollOptions {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll({
  loading,
  hasMore,
  onLoadMore,
  threshold = 0.1,
  rootMargin = '0px',
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const triggerRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!hasMore) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loading) {
            onLoadMore();
          }
        },
        { threshold, rootMargin }
      );

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [loading, hasMore, onLoadMore, threshold, rootMargin]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { triggerRef };
}

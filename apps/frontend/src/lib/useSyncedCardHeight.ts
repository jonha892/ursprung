import { useEffect, useRef, useState } from "react";

export interface UseSyncedCardHeightOptions {
  minContentHeight?: number;
  cardPaddingOffset?: number;
}

/**
 * Keeps a chat panel height in sync with an associated edit card.
 */
export function useSyncedCardHeight(
  { minContentHeight = 400, cardPaddingOffset = 60 }: UseSyncedCardHeightOptions = {}
) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number>(minContentHeight);

  useEffect(() => {
    const measure = () => {
      const node = cardRef.current;
      if (!node) return;
      const raw = node.offsetHeight - cardPaddingOffset;
      setContentHeight(Math.max(minContentHeight, raw));
    };

    measure();

    const observer = new ResizeObserver(() => measure());
    const node = cardRef.current;
    if (node) observer.observe(node);

    globalThis.addEventListener("resize", measure);

    return () => {
      if (node) observer.unobserve(node);
      observer.disconnect();
      globalThis.removeEventListener("resize", measure);
    };
  }, [cardPaddingOffset, minContentHeight]);

  return { cardRef, contentHeight };
}

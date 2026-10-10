"use client";

import { createContext, useContext, useMemo, useState } from "react";

// "Optimistic" UI: when you delete something, it disappears RIGHT AWAY,
// before the server has answered. The server works in the background; if it
// refuses, the item simply comes back. On a slow connection this is the
// difference between "instant" and "a second or two of nothing happening".
//
//   <OptimisticItem as="li">   …row…   <ConfirmAction removesItem … />   </OptimisticItem>

type ItemControls = { hide: () => void; show: () => void };

const ItemContext = createContext<ItemControls | null>(null);

export function OptimisticItem({
  as: Tag = "li",
  className,
  children,
}: {
  as?: "li" | "div";
  className?: string;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  const controls = useMemo(() => ({ hide: () => setHidden(true), show: () => setHidden(false) }), []);
  if (hidden) return null;
  return (
    <ItemContext value={controls}>
      <Tag className={className}>{children}</Tag>
    </ItemContext>
  );
}

// null when the component isn't inside an <OptimisticItem>
export function useOptimisticItem() {
  return useContext(ItemContext);
}

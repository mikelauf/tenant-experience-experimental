"use client";

import { useSyncExternalStore } from "react";

/** Corner style for the whole UI. A reviewer preference, kept apart from demo state so "Reset demo" leaves it alone. */
export type Shape = "rounded" | "flat";

export const SHAPE_KEY = "pyramid-shape";

/** Runs in <head> before paint so a flat reload never flashes rounded corners. */
export const shapeBootScript = `try{if(localStorage.getItem("${SHAPE_KEY}")==="flat")document.documentElement.dataset.shape="flat"}catch(e){}`;

const listeners = new Set<() => void>();
const read = (): Shape => (document.documentElement.dataset.shape === "flat" ? "flat" : "rounded");

export function setShape(shape: Shape) {
  const root = document.documentElement;
  if (shape === "flat") root.dataset.shape = "flat";
  else delete root.dataset.shape;
  try {
    localStorage.setItem(SHAPE_KEY, shape);
  } catch {}
  listeners.forEach((l) => l());
}

export function useShape(): Shape {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => "rounded",
  );
}

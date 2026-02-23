import { useCallback, useState } from "react";

export const useResizablePanel = (
  storageKey: string,
  initialWidth: number,
  minWidth = 200,
) => {
  const [width, setWidth] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed) && parsed >= minWidth) return parsed;
    }
    return initialWidth;
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = startX - moveEvent.clientX; // 左ドラッグ = 幅を広げる
        const newWidth = Math.max(minWidth, startWidth + dx);
        setWidth(newWidth);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        const dx = startX - upEvent.clientX;
        const finalWidth = Math.max(minWidth, startWidth + dx);
        localStorage.setItem(storageKey, String(finalWidth));
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [width, minWidth, storageKey],
  );

  return { width, handleMouseDown };
};

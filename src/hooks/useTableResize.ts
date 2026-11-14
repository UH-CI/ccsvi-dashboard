import { useState, useCallback, useEffect, useRef } from "react";

const SHORT_VIEWPORT = 700;
const COLLAPSE_THRESHOLD = 40;
const MIN_TABLE_HEIGHT = 96;

// The table's size, decided only here: collapsed, full height, or a height dragged with the handle
export const useTableResize = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullHeight, setIsFullHeight] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const autoCollapsedRef = useRef(false);
  // A ref keeps the effect closure current without making it a dep (which would re-run check() on every state change)
  const isCollapsedRef = useRef(isCollapsed);
  isCollapsedRef.current = isCollapsed;

  useEffect(() => {
    const check = () => {
      if (window.innerHeight < SHORT_VIEWPORT && !isCollapsedRef.current) {
        autoCollapsedRef.current = true;
        setIsCollapsed(true);
        setIsFullHeight(false);
      } else if (window.innerHeight >= SHORT_VIEWPORT && autoCollapsedRef.current) {
        autoCollapsedRef.current = false;
        setIsCollapsed(false);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleCollapse = useCallback(() => {
    autoCollapsedRef.current = false;
    const newCollapsed = !isCollapsedRef.current;
    setIsCollapsed(newCollapsed);
    if (newCollapsed) setIsFullHeight(false);
  }, []);

  const toggleFullHeight = useCallback(() => {
    const newFull = !isFullHeight;
    setIsFullHeight(newFull);
    if (newFull) setIsCollapsed(false);
  }, [isFullHeight]);

  const setCollapsed = useCallback((collapsed: boolean) => {
    if (collapsed !== isCollapsedRef.current) {
      if (!collapsed) autoCollapsedRef.current = false;
      setIsCollapsed(collapsed);
      if (collapsed) setIsFullHeight(false);
    }
  }, []);

  // Dragging the handle: near the bottom collapses, near the top goes full height, in between sets the height
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = window.innerHeight - moveEvent.clientY;
      const maxHeight = window.innerHeight * 0.85;
      if (newHeight < COLLAPSE_THRESHOLD) {
        setIsCollapsed(true);
        setIsFullHeight(false);
        setHeight(null);
      } else if (newHeight > maxHeight + 40) {
        setIsFullHeight(true);
        setIsCollapsed(false);
        setHeight(null);
      } else {
        setIsCollapsed(false);
        setIsFullHeight(false);
        setHeight(Math.max(MIN_TABLE_HEIGHT, Math.min(maxHeight, newHeight)));
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return {
    isCollapsed,
    isFullHeight,
    height,
    toggleCollapse,
    toggleFullHeight,
    setCollapsed,
    startResize,
  };
};

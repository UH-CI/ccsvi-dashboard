import { useState, useCallback, useEffect, useRef } from "react";

interface UseTableResizeOptions {
  onSizeChange?: (isCollapsed: boolean) => void;
  initialCollapsed?: boolean;
}

export const useTableResize = ({
  onSizeChange,
  initialCollapsed = false,
}: UseTableResizeOptions = {}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isFullHeight, setIsFullHeight] = useState(false);
  const autoCollapsedRef = useRef(false);
  // Refs keep the effect closure current without making them deps (which would re-run check() on every state change)
  const isCollapsedRef = useRef(isCollapsed);
  const onSizeChangeRef = useRef(onSizeChange);
  isCollapsedRef.current = isCollapsed;
  onSizeChangeRef.current = onSizeChange;

  useEffect(() => {
    const SHORT_VIEWPORT = 700;
    const check = () => {
      if (window.innerHeight < SHORT_VIEWPORT && !isCollapsedRef.current) {
        autoCollapsedRef.current = true;
        setIsCollapsed(true);
        setIsFullHeight(false);
        onSizeChangeRef.current?.(true);
      } else if (window.innerHeight >= SHORT_VIEWPORT && autoCollapsedRef.current) {
        autoCollapsedRef.current = false;
        setIsCollapsed(false);
        onSizeChangeRef.current?.(false);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCollapse = useCallback(() => {
    autoCollapsedRef.current = false;
    const newCollapsed = !isCollapsedRef.current;
    setIsCollapsed(newCollapsed);
    if (newCollapsed) setIsFullHeight(false);
    onSizeChangeRef.current?.(newCollapsed);
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
      onSizeChangeRef.current?.(collapsed);
    }
  }, []);

  const setFullHeight = useCallback((full: boolean) => {
    setIsFullHeight(full);
    if (full) setIsCollapsed(false);
  }, []);

  return {
    isCollapsed,
    isFullHeight,
    toggleCollapse,
    toggleFullHeight,
    setCollapsed,
    setFullHeight,
  };
};

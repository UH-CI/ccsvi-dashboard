import { useState, useCallback } from "react";

interface UseTableResizeOptions {
  onSizeChange?: (isCollapsed: boolean) => void;
  initialCollapsed?: boolean;
}

/**
 * Simple hook for managing table collapse/expand state
 */
export const useTableResize = ({
  onSizeChange,
  initialCollapsed = false,
}: UseTableResizeOptions = {}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isFullHeight, setIsFullHeight] = useState(false);

  const toggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (newCollapsed) setIsFullHeight(false);
    onSizeChange?.(newCollapsed);
  }, [isCollapsed, onSizeChange]);

  const toggleFullHeight = useCallback(() => {
    const newFull = !isFullHeight;
    setIsFullHeight(newFull);
    if (newFull) setIsCollapsed(false);
  }, [isFullHeight]);

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      if (collapsed !== isCollapsed) {
        setIsCollapsed(collapsed);
        if (collapsed) setIsFullHeight(false);
        onSizeChange?.(collapsed);
      }
    },
    [isCollapsed, onSizeChange],
  );

  return {
    isCollapsed,
    isFullHeight,
    toggleCollapse,
    toggleFullHeight,
    setCollapsed,
  };
};

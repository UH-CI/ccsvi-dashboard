import { useState, useCallback } from 'react';

interface UseTableResizeOptions {
    onSizeChange?: (isCollapsed: boolean) => void;
    initialCollapsed?: boolean;
}

/**
 * Simple hook for managing table collapse/expand state
 */
export const useTableResize = ({
                                   onSizeChange,
                                   initialCollapsed = false
                               }: UseTableResizeOptions = {}) => {
    const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

    const toggleCollapse = useCallback(() => {
        const newCollapsed = !isCollapsed;
        setIsCollapsed(newCollapsed);
        onSizeChange?.(newCollapsed);
    }, [isCollapsed, onSizeChange]);

    const setCollapsed = useCallback((collapsed: boolean) => {
        if (collapsed !== isCollapsed) {
            setIsCollapsed(collapsed);
            onSizeChange?.(collapsed);
        }
    }, [isCollapsed, onSizeChange]);

    return {
        isCollapsed,
        toggleCollapse,
        setCollapsed,
    };
};
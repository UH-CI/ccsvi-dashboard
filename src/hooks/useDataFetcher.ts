import { useState, useEffect, useRef } from 'react';

export interface FetchState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    loaded: boolean;
}

export interface FetchOptions {
    enabled?: boolean;
    skipIfLoaded?: boolean;
    errorPrefix?: string;
}

export const useDataFetcher = <T = unknown>(
    url: string | null,
    options: FetchOptions = {}
): FetchState<T> => {
    const {
        enabled = true,
        skipIfLoaded = true,
        errorPrefix = 'Failed to fetch data'
    } = options;

    const [state, setState] = useState<FetchState<T>>({
        data: null,
        loading: false,
        error: null,
        loaded: false,
    });

    // Track loading state to prevent duplicate requests
    const loadingRef = useRef<boolean>(false);
    // Track loaded state without causing re-renders
    const loadedRef = useRef<boolean>(false);
    // Track the last successfully fetched URL
    const lastUrlRef = useRef<string | null>(null);

    useEffect(() => {
        // Don't load if not enabled
        if (!enabled) {
            // Clear data if disabled
            if (state.data !== null) {
                setState({
                    data: null,
                    loading: false,
                    error: null,
                    loaded: false
                });
                loadedRef.current = false;
                lastUrlRef.current = null;
            }
            return;
        }

        // Don't load if no URL provided
        if (!url) {
            return;
        }

        // If already loaded this URL and skipIfLoaded is true, don't reload
        if (skipIfLoaded && loadedRef.current && lastUrlRef.current === url) {
            return;
        }

        // If already loading, don't start another request
        if (loadingRef.current) {
            return;
        }

        const fetchData = async () => {
            loadingRef.current = true;
            setState(prev => ({ ...prev, loading: true, error: null }));

            try {
                const response = await fetch(url);

                if (!response.ok) {
                    const errorMessage = `${errorPrefix}: ${response.status} ${response.statusText}`;
                    setState({
                        data: null,
                        loading: false,
                        error: errorMessage,
                        loaded: false
                    });
                    loadedRef.current = false;
                    lastUrlRef.current = null;
                    return;
                }

                const data = await response.json() as T;
                setState({
                    data,
                    loading: false,
                    error: null,
                    loaded: true
                });
                loadedRef.current = true;
                lastUrlRef.current = url;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : errorPrefix;
                console.error(`${errorPrefix}:`, err);
                setState({
                    data: null,
                    loading: false,
                    error: errorMessage,
                    loaded: false
                });
                loadedRef.current = false;
                lastUrlRef.current = null;
            } finally {
                loadingRef.current = false;
            }
        };

        fetchData().catch(console.error);
    }, [url, enabled, skipIfLoaded, errorPrefix]);

    return state;
};
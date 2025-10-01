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

// Single url source data fetcher
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

    const loadingRef = useRef<boolean>(false);

    useEffect(() => {
        // Don't load if not enabled
        if (!enabled) {
            if (state.data) {
                setState(prev => ({ ...prev, data: null, loaded: false }));
            }
            return;
        }

        // Don't load if no URL provided
        if (!url) {
            return;
        }

        // If already loaded and skipIfLoaded is true, don't reload
        if (skipIfLoaded && state.loaded && state.data) {
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
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: errorMessage,
                    }));
                    return;
                }

                const data = await response.json() as T;
                setState(prev => ({
                    ...prev,
                    data,
                    loading: false,
                    loaded: true,
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : errorPrefix;
                console.error(`${errorPrefix}:`, err);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: errorMessage,
                }));
            } finally {
                loadingRef.current = false;
            }
        };

        fetchData().catch(console.error);
    }, [url, enabled, skipIfLoaded, state.loaded, state.data, errorPrefix]);

    return state;
};
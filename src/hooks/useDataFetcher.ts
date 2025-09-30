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

export const useMultiDataFetcher = <T extends object>(
    sources: Array<{ key: keyof T; url: string; errorPrefix?: string }>,
    options: Omit<FetchOptions, 'errorPrefix'> = {}
): FetchState<T> & { partialErrors: Record<string, string> } => {
    const { enabled = true, skipIfLoaded = true } = options;

    const [state, setState] = useState<FetchState<T> & { partialErrors: Record<string, string> }>({
        data: null,
        loading: false,
        error: null,
        loaded: false,
        partialErrors: {},
    });

    const loadingRef = useRef<boolean>(false);

    useEffect(() => {
        if (!enabled || sources.length === 0) {
            return;
        }

        if (skipIfLoaded && state.loaded && state.data) {
            return;
        }

        if (loadingRef.current) {
            return;
        }

        const fetchAllData = async () => {
            loadingRef.current = true;
            setState(prev => ({ ...prev, loading: true, error: null, partialErrors: {} }));

            try {
                const results = await Promise.all(
                    sources.map(async ({ key, url, errorPrefix = 'Failed to fetch data' }) => {
                        try {
                            const response = await fetch(url);
                            if (!response.ok) {
                                throw new Error(`${response.status} ${response.statusText}`);
                            }
                            const data = await response.json();
                            return { key, data, error: null };
                        } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : errorPrefix;
                            console.error(`${errorPrefix}:`, err);
                            return { key, data: null, error: errorMessage };
                        }
                    })
                );

                const combinedData = {} as T;
                const partialErrors: Record<string, string> = {};
                let hasAnyData = false;

                results.forEach(({ key, data, error }) => {
                    if (data) {
                        combinedData[key] = data;
                        hasAnyData = true;
                    }
                    if (error) {
                        partialErrors[key as string] = error;
                    }
                });

                // If all fetches failed, set a global error
                if (!hasAnyData) {
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: 'All data fetches failed',
                        partialErrors,
                    }));
                    return;
                }

                setState(prev => ({
                    ...prev,
                    data: combinedData,
                    loading: false,
                    loaded: true,
                    partialErrors,
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
                console.error('Error in multi-fetch:', err);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: errorMessage,
                }));
            } finally {
                loadingRef.current = false;
            }
        };

        fetchAllData().catch(console.error);
    }, [sources, enabled, skipIfLoaded, state.loaded, state.data]);

    return state;
};

export const useConditionalDataFetcher = <T = unknown>(
    url: string | null,
    condition: boolean,
    options: Omit<FetchOptions, 'enabled'> = {}
): FetchState<T> => {
    return useDataFetcher<T>(url, { ...options, enabled: condition });
};
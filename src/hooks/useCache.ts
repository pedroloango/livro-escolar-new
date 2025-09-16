import { useState, useEffect, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  enabled?: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
} {
  const { ttl = DEFAULT_TTL, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const isExpired = (entry: CacheEntry<T>): boolean => {
    return Date.now() - entry.timestamp > entry.ttl;
  };

  const getCachedData = (): T | null => {
    if (!enabled) return null;
    
    const entry = cacheRef.current.get(key);
    if (entry && !isExpired(entry)) {
      return entry.data;
    }
    return null;
  };

  const setCachedData = (newData: T): void => {
    if (!enabled) return;
    
    cacheRef.current.set(key, {
      data: newData,
      timestamp: Date.now(),
      ttl,
    });
  };

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const cachedData = getCachedData();
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      const result = await fetcher();
      setData(result);
      setCachedData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async (): Promise<void> => {
    cacheRef.current.delete(key);
    await fetchData();
  };

  const clearCache = (): void => {
    cacheRef.current.delete(key);
    setData(null);
  };

  useEffect(() => {
    fetchData();
  }, [key]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
  };
}

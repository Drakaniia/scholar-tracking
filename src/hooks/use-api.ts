'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions<T> {
  initialData?: T;
  immediate?: boolean;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(
  url: string,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const { initialData = null, immediate = true } = options;
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'An error occurred');
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
}

interface UseMutationOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

interface UseMutationReturn<TInput> {
  mutate: (input: TInput) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useMutation<TInput>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
  options: UseMutationOptions = {}
): UseMutationReturn<TInput> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (input: TInput): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(input) : undefined,
      });

      const json = await res.json();

      if (json.success) {
        options.onSuccess?.(json.data);
        return true;
      } else {
        const errorMsg = json.error || 'Operation failed';
        setError(errorMsg);
        options.onError?.(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = 'Request failed';
      setError(errorMsg);
      options.onError?.(errorMsg);
      console.error('Mutation Error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}

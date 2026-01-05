import { useState, useCallback, useEffect } from "react";

/**
 * Hook for debounced search
 * Prevents making requests on every keystroke
 */
export const useDebouncedSearch = (initialValue = "", delay = 500) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return [value, setValue, debouncedValue];
};

/**
 * Hook for infinite scroll
 * Handles pagination with proper loading states
 */
export const useInfiniteScroll = (fetchMore) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        if (!isLoading) {
          setIsLoading(true);
          fetchMore?.().finally(() => setIsLoading(false));
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLoading, fetchMore]);

  return isLoading;
};

/**
 * Hook for async operations with proper error handling
 */
export const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = useState(immediate ? "pending" : "idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setStatus("pending");
    setData(null);
    setError(null);

    try {
      const response = await asyncFunction();
      setData(response);
      setStatus("success");
      return response;
    } catch (err) {
      setError(err);
      setStatus("error");
      throw err;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  return { execute, status, data, error };
};

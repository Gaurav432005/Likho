import { useEffect, useRef } from "react";

/**
 * Hook to track if component is still mounted
 * Prevents state updates after unmount
 */
export const useIsMounted = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
};

/**
 * Hook for safe state updates
 * Automatically checks if component is mounted before updating
 */
export const useSafeState = (initialState) => {
  const [state, setState] = React.useState(initialState);
  const isMountedRef = useIsMounted();

  const setSafeState = React.useCallback((value) => {
    if (isMountedRef.current) {
      setState(value);
    }
  }, [isMountedRef]);

  return [state, setSafeState];
};

import { useEffect, useRef, useState } from "react";
export function useAsync(fn, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const cancelled = useRef(false);
  useEffect(() => {
    cancelled.current = false;
    setLoading(true);
    setError(null);
    fn().then(res => {
      if (!cancelled.current) {
        setData(res);
        setLoading(false);
      }
    }).catch(e => {
      if (!cancelled.current) {
        setError(e.message || "Something went wrong");
        setLoading(false);
      }
    });
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return {
    data,
    loading,
    error,
    refetch: () => setTick(t => t + 1)
  };
}
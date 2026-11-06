import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Preserves existing query params during legacy redirects and injects target defaults.
 * e.g. /fences?id=123 -> /studio?panel=fence&id=123
 */
export default function LegacyRedirect({ to, defaultParams = {} }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // Set default query parameters if not already present
  Object.entries(defaultParams).forEach(([k, v]) => {
    if (!searchParams.has(k)) {
      searchParams.set(k, v);
    }
  });

  const qs = searchParams.toString();
  const target = qs ? `${to}?${qs}` : to;

  return <Navigate to={target} replace />;
}

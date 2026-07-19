import { useCallback, useState } from "react";
import { search } from "../api/client.js";

// Shared search state for both modes — one request/response, User Mode just
// renders a curated subset of it while Developer Mode renders all of it.
export function useOfficeSearch(dataSource) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);

  const runSearch = useCallback(
    async (params) => {
      const requestBody = { dataSource, ...params };
      setLoading(true);
      setError(null);
      setLastRequest(requestBody);
      try {
        const data = await search(requestBody);
        setResponse(data);
        return data;
      } catch (err) {
        setError(err.message || "Search failed");
        setResponse(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dataSource]
  );

  return { response, loading, error, lastRequest, runSearch };
}

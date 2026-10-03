import { useContext, useEffect, useState, type DependencyList } from 'react';
import { ResourceContext } from '../data/ResourceContext';

type ResourceState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: null; error: Error };

export function useAsyncResource<T>(
  key: string,
  load: () => Promise<T>,
  dependencies: DependencyList = [],
): ResourceState<T> {
  const serverData = useContext(ResourceContext);
  const hasServerData = Object.prototype.hasOwnProperty.call(serverData, key);
  const [state, setState] = useState<ResourceState<T>>(
    hasServerData
      ? { status: 'ready', data: serverData[key] as T, error: null }
      : { status: 'loading', data: null, error: null },
  );

  useEffect(() => {
    if (hasServerData) {
      return;
    }

    let cancelled = false;

    setState({ status: 'loading', data: null, error: null });
    load()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return state;
}

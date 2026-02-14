type Unsubscribe = () => void;

export type Reducer<S, A> = (state: S, action: A) => S;
export type Listener<S, A> = (state: S, action: A) => void;

/**
 * Small reusable custom store.
 *
 * Goals:
 * - Tiny surface area: getState / dispatch / subscribe
 * - Typed reducer-driven updates
 * - No framework dependency (works with Solid, React, vanilla DOM, workers, etc.)
 *
 * Notes:
 * - This store is synchronous: dispatch runs reducer and then notifies subscribers.
 * - Subscribers are notified in insertion order.
 * - Listeners are snapshotted during dispatch so unsubscribing/resubscribing during
 *   notification is safe.
 */
export type Store<S, A> = {
  getState(): S;
  dispatch(action: A): void;
  subscribe(listener: Listener<S, A>): Unsubscribe;
};

export function createStore<S, A>(options: {
  initialState: S;
  reducer: Reducer<S, A>;
}): Store<S, A> {
  const { initialState, reducer } = options;

  let state = initialState;
  const listeners = new Set<Listener<S, A>>();

  return {
    getState() {
      return state;
    },

    dispatch(action: A) {
      state = reducer(state, action);

      // Snapshot so listeners can safely unsubscribe/subscribe during notification.
      const snapshot = Array.from(listeners);
      for (const listener of snapshot) {
        // In case it was removed since snapshot
        if (!listeners.has(listener)) continue;
        listener(state, action);
      }
    },

    subscribe(listener: Listener<S, A>) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function shallowEqual<T extends Record<string, any>>(a: T, b: T) {
  if (a === b) return true;
  for (const k in a) if (a[k] !== b[k]) return false;
  return true;
}

export function watchSelector<S, A, T>(
  store: Store<S, A>,
  selector: (state: S) => T,
  effect: (curr: T, prev: T | undefined, action: A) => void | (() => void),
  isEqual: (a: T, b: T) => boolean = Object.is,
  options?: { fireImmediately?: boolean },
): Unsubscribe {
  let prev = selector(store.getState());
  let cleanup: (() => void) | void;

  if (options?.fireImmediately) {
    cleanup = effect(prev, undefined, undefined as any);
  }

  return store.subscribe((state, action) => {
    const next = selector(state);

    if (isEqual(prev, next)) return;

    if (cleanup) cleanup();

    cleanup = effect(next, prev, action);
    prev = next;
  });
}

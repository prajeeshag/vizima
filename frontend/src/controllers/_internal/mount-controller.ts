import type { JSX } from "solid-js/jsx-runtime";
import { createSignal, onCleanup } from "solid-js";
import { render } from "solid-js/web";

/**
 * External-store subscription contract used by controllers in this folder.
 * Returns an `unsubscribe` function.
 */
export type ExternalSubscribe = (listener: () => void) => () => void;

/**
 * Options for mounting a Solid controller that is driven by an external store.
 *
 * `value` is required and MUST be a getter. This keeps controllers consistently
 * "controlled" from the outside, while still allowing local UI state.
 */
export type MountControllerOptions<TValue> = {
  /** Controlled value accessor (e.g. from your store). Required. */
  value: () => TValue;

  /** Called when the UI requests a value change. */
  onChange: (value: TValue) => void;

  /**
   * Subscribe to external-store changes. When invoked, the controller will
   * refresh its bridged value from `value()`.
   */
  subscribe: ExternalSubscribe;

  /**
   * Optional hook for registering styles once per controller.
   * Kept as a callback so the helper stays decoupled from your style system.
   */
  registerStyles?: () => void;
};

export type ControllerRenderProps<TValue> = {
  /**
   * Bridged value accessor. This is a Solid signal that mirrors the external
   * `options.value()` and updates when `options.subscribe` fires.
   */
  value: () => TValue;

  /** Forwarded change handler. */
  onChange: (value: TValue) => void;
};

/**
 * Mount a Solid controller into a container, bridging an external store into
 * a local signal for reactive UI updates.
 *
 * Pattern:
 * - seed local signal from `options.value()`
 * - subscribe to external store, refreshing local signal on notifications
 * - render controller view with bridged `value()` accessor
 * - auto-cleanup subscription on unmount
 *
 * Returns Solid's unmount/cleanup function.
 */
export function mountController<TValue>(
  container: HTMLElement,
  options: MountControllerOptions<TValue>,
  view: (props: ControllerRenderProps<TValue>) => JSX.Element,
): () => void {
  options.registerStyles?.();

  const unmount = render(() => {
    const [bridged, setBridged] = createSignal<TValue>(options.value());

    const unsubscribe = options.subscribe(() => {
      // Use functional setter form so function-valued states don't get treated as updaters.
      setBridged(() => options.value());
    });

    onCleanup(() => {
      unsubscribe?.();
    });

    return view({
      value: bridged,
      onChange: (next) => options.onChange(next),
    });
  }, container);

  return unmount;
}

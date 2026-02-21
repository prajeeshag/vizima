import type { JSX } from "solid-js/jsx-runtime";
import { createSignal, onCleanup } from "solid-js";
import { render } from "solid-js/web";

export type ExternalSubscribe = (listener: () => void) => () => void;

export type ControllerRenderProps<TValue> = {
  value: () => TValue;
};

type MountControllerOptions<TValue> = ControllerRenderProps<TValue> & {
  subscribe: ExternalSubscribe;
};

export function mountController<
  P extends MountControllerOptions<TValue>,
  TValue,
>(
  container: HTMLElement,
  options: P,
  view: (props: P) => JSX.Element,
): () => void {
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
      ...options,
      value: bridged,
    });
  }, container);

  return unmount;
}

import type { JSX } from "solid-js/jsx-runtime";
import { createSignal, onCleanup } from "solid-js";
import { render } from "solid-js/web";

export type ExternalSubscribe = (listener: () => void) => () => void;

export type ControllerRenderProps<TValue> = {
  value: () => TValue;
  onChange?: (value: TValue) => void;
};

type MountControllerOptions<TValue> = ControllerRenderProps<TValue> & {
  subscribe: ExternalSubscribe;
};

export function mountController<TValue>(
  container: HTMLElement,
  options: MountControllerOptions<TValue>,
  view: (props: ControllerRenderProps<TValue>) => JSX.Element,
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
      value: bridged,
      onChange: options.onChange,
    });
  }, container);

  return unmount;
}

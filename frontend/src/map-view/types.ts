type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type IdOf<T> = T extends { id: infer I } ? I : never;

type HasDuplicate<T extends readonly any[], Seen = never> = T extends readonly [
  infer H,
  ...infer R,
]
  ? IdOf<H> extends Seen
    ? true
    : HasDuplicate<R, Seen | IdOf<H>>
  : false;

export type UniqueCanvasStack<T extends readonly { id: string }[]> =
  HasDuplicate<T> extends true
    ? "Error: Duplicate IDs found in CanvasStack" // Custom error message
    : T;

export type ExtractProps<T> = T extends readonly [
  ...infer Layers extends readonly {
    id: PropertyKey;
    renderers: readonly unknown[];
  }[],
]
  ? {
      [L in Layers[number] as L["id"]]: L["renderers"] extends readonly [
        ...infer P,
      ]
        ? {
            [J in keyof P]: P[J] extends (props: infer Props) => any
              ? Expand<Omit<Props, "proj" | "viewSize">>
              : never;
          }
        : never;
    }
  : never;

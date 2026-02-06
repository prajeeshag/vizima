// style-registry.ts
type StyleEntry = {
  id: string;
  css: string;
};

class StyleRegistry {
  private styles = new Map<string, string>();
  private injected = false;

  register(id: string, css: string): void {
    if (this.styles.has(id)) return;
    this.styles.set(id, css);
  }

  inject(layer = "vizima"): void {
    if (this.injected || this.styles.size === 0) return;

    const style = document.createElement("style");
    style.textContent = `@layer ${layer}\n {\n${[...this.styles.values()].join("\n")}\n}`;
    document.head.appendChild(style);
    this.injected = true;
  }
}

export const styleRegistry = new StyleRegistry();

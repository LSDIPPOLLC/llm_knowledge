import { Decoration, EditorView, ViewPlugin, ViewUpdate, MatchDecorator, DecorationSet } from "@codemirror/view";

const decorator = new MatchDecorator({
  regexp: /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g,
  decoration: (m) =>
    Decoration.mark({
      class: "cm-wikilink",
      attributes: { "data-target": m[1].trim() },
    }),
});

export const wikilinkPlugin = (onOpen: (target: string) => void) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }
      update(u: ViewUpdate) {
        this.decorations = decorator.updateDeco(u, this.decorations);
      }
    },
    {
      decorations: (v) => v.decorations,
      eventHandlers: {
        mousedown(e, view) {
          const t = e.target as HTMLElement;
          if (t.classList.contains("cm-wikilink") && (e.metaKey || e.ctrlKey)) {
            const tgt = t.getAttribute("data-target");
            if (tgt) { e.preventDefault(); onOpen(tgt); }
          }
        },
      },
    }
  );

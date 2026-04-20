import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeReact from "rehype-react";
import { visit } from "unist-util-visit";
import { Fragment, createElement } from "react";
import * as prod from "react/jsx-runtime";

// remark plugin: convert [[wikilink]] text into <a data-wikilink="target">
function remarkWikilink() {
  return (tree: any) => {
    visit(tree, "text", (node: any, idx: any, parent: any) => {
      if (!parent || idx == null) return;
      const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
      const val: string = node.value;
      if (!re.test(val)) return;
      re.lastIndex = 0;
      const children: any[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(val))) {
        if (m.index > last) children.push({ type: "text", value: val.slice(last, m.index) });
        const target = m[1].trim();
        const label = (m[2] || target).trim();
        children.push({
          type: "link",
          url: `#wikilink:${encodeURIComponent(target)}`,
          data: { hProperties: { "data-wikilink": target, className: "wikilink" } },
          children: [{ type: "text", value: label }],
        });
        last = re.lastIndex;
      }
      if (last < val.length) children.push({ type: "text", value: val.slice(last) });
      parent.children.splice(idx, 1, ...children);
      return idx + children.length;
    });
  };
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), ["className"], ["dataWikilink"]],
  },
};

export function mdToReact(src: string, onWikilinkClick: (target: string) => void) {
  const file = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkWikilink)
    .use(remarkRehype)
    .use(rehypeSanitize as any, sanitizeSchema)
    .use(rehypeReact, {
      Fragment,
      jsx: (prod as any).jsx,
      jsxs: (prod as any).jsxs,
      createElement,
      components: {
        a: (props: any) => {
          if (props["data-wikilink"]) {
            return (
              <a
                className="wikilink"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onWikilinkClick(props["data-wikilink"]);
                }}
              >
                {props.children}
              </a>
            );
          }
          return <a {...props} target="_blank" rel="noreferrer" />;
        },
      },
    } as any)
    .processSync(src);
  return file.result as any;
}

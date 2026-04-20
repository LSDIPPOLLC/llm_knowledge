import yaml from "js-yaml";

const FM = /^---\n([\s\S]*?)\n---\n?/;

export interface ParsedMd {
  frontmatter: Record<string, any> | null;
  body: string;
  raw: string;
}

export function parseMd(raw: string): ParsedMd {
  const m = raw.match(FM);
  if (!m) return { frontmatter: null, body: raw, raw };
  try {
    const fm = yaml.load(m[1]) as Record<string, any> | null;
    return { frontmatter: fm, body: raw.slice(m[0].length), raw };
  } catch {
    return { frontmatter: null, body: raw, raw };
  }
}

type AdfMark = {
  type?: string;
  attrs?: {
    href?: string;
    url?: string;
  };
};

type AdfNode = {
  type?: string;
  text?: string;
  content?: AdfNode[];
  marks?: AdfMark[];
  attrs?: {
    href?: string;
    url?: string;
  };
};

function linkHrefFromMarks(marks: AdfMark[] | undefined): string | null {
  if (!marks) return null;
  for (const mark of marks) {
    if (mark.type !== "link") continue;
    const href = mark.attrs?.href ?? mark.attrs?.url;
    if (typeof href === "string" && href.trim()) {
      return href.trim();
    }
  }
  return null;
}

function textWithOptionalLink(text: string, href: string | null): string {
  if (!href) return text;
  if (text.includes(href) || text === href) return text;
  return `${text} ${href}`;
}

export function adfToPlainText(node: unknown): string {
  if (typeof node === "string") {
    return node;
  }

  if (!node || typeof node !== "object") {
    return "";
  }

  const adf = node as AdfNode;

  if (adf.type === "text" && typeof adf.text === "string") {
    return textWithOptionalLink(adf.text, linkHrefFromMarks(adf.marks));
  }

  if (adf.type === "inlineCard" || adf.type === "blockCard" || adf.type === "embedCard") {
    const url = adf.attrs?.url ?? adf.attrs?.href;
    if (typeof url === "string" && url.trim()) {
      return url.trim();
    }
  }

  if (!Array.isArray(adf.content)) {
    return "";
  }

  const parts = adf.content.map((child) => adfToPlainText(child));

  if (adf.type === "paragraph" || adf.type === "heading") {
    return parts.join("");
  }

  return parts.filter(Boolean).join("\n");
}

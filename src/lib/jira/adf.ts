type AdfNode = {
  type?: string;
  text?: string;
  content?: AdfNode[];
};

export function adfToPlainText(node: unknown): string {
  if (typeof node === "string") {
    return node;
  }

  if (!node || typeof node !== "object") {
    return "";
  }

  const adf = node as AdfNode;

  if (adf.type === "text" && typeof adf.text === "string") {
    return adf.text;
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

import { createElement, type ReactNode } from "react";

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/;

function splitUrlMatch(raw: string): { href: string; trailing: string } {
  const trailingMatch = raw.match(TRAILING_PUNCT);
  if (!trailingMatch) {
    return { href: raw, trailing: "" };
  }
  const trailing = trailingMatch[0];
  return { href: raw.slice(0, -trailing.length), trailing };
}

/** Split plain text into text nodes and external links (open in a new tab). */
export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);

  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    const { href, trailing } = splitUrlMatch(match[0]);
    if (href) {
      nodes.push(
        createElement(
          "a",
          {
            key: `link-${start}`,
            href,
            target: "_blank",
            rel: "noopener noreferrer",
          },
          href,
        ),
      );
    }
    if (trailing) {
      nodes.push(trailing);
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

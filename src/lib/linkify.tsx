import { Fragment, type ReactNode } from "react";

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"')]+[^\s<>"'.,;:!?)\]])/gi;

export function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  text.replace(URL_RE, (match, _g1, offset: number) => {
    if (offset > last) out.push(<Fragment key={`t${i++}`}>{text.slice(last, offset)}</Fragment>);
    const href = match.startsWith("http") ? match : `https://${match}`;
    out.push(
      <a
        key={`l${i++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
      >
        {match}
      </a>
    );
    last = offset + match.length;
    return match;
  });
  if (last < text.length) out.push(<Fragment key={`t${i++}`}>{text.slice(last)}</Fragment>);
  return out;
}
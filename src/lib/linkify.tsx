import { Fragment, type ReactNode } from "react";
import { EMOJI_SHORTCODES } from "./emoji-shortcodes";

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"')]+[^\s<>"'.,;:!?)\]])/gi;
const EMOJI_RE = /:([a-z0-9_+-]{2,32}):/gi;

export function linkify(text: string, customEmojis?: Record<string, string>): ReactNode[] {
  // Replace :name: tokens: prefer custom-emoji image, fall back to unicode shortcode
  const parts: ReactNode[] = [];
  let idx = 0;
  let cursor = 0;
  const hasCustom = customEmojis && Object.keys(customEmojis).length > 0;
  text.replace(EMOJI_RE, (match, name: string, offset: number) => {
    const lower = name.toLowerCase();
    const url = hasCustom ? customEmojis![lower] : undefined;
    const unicode = url ? undefined : EMOJI_SHORTCODES[lower];
    if (!url && !unicode) return match;
    if (offset > cursor) parts.push(...linkifyOnly(text.slice(cursor, offset), `s${idx++}`));
    if (url) {
      parts.push(
        <img key={`e${idx++}`} src={url} alt={`:${name}:`} title={`:${name}:`}
          className="inline-block h-5 w-5 align-text-bottom mx-0.5" />,
      );
    } else {
      parts.push(<Fragment key={`u${idx++}`}>{unicode}</Fragment>);
    }
    cursor = offset + match.length;
    return match;
  });
  if (cursor < text.length) parts.push(...linkifyOnly(text.slice(cursor), `s${idx++}`));
  return parts.length ? parts : linkifyOnly(text, "s");
}

function linkifyOnly(text: string, prefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  text.replace(URL_RE, (match, _g1, offset: number) => {
    if (offset > last) out.push(<Fragment key={`${prefix}t${i++}`}>{text.slice(last, offset)}</Fragment>);
    const href = match.startsWith("http") ? match : `https://${match}`;
    out.push(
      <a
        key={`${prefix}l${i++}`}
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
  if (last < text.length) out.push(<Fragment key={`${prefix}t${i++}`}>{text.slice(last)}</Fragment>);
  return out;
}
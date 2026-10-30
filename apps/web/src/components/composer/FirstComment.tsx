import { PlatformIcon } from "../PlatformIcon";

interface PlatformCommentLimit {
  platform: string;
  limit: number;
  commentCount: number;
  commentOver: boolean;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  platformLimits?: PlatformCommentLimit[];
}

export function FirstComment({ value, onChange, platformLimits }: Props) {
  return (
    <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide">First Comment</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ color: "#999", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
      </div>
      <p className="text-xs mb-2.5" style={{ color: "#999" }}>
        Posted as the first reply immediately after your post goes live.
      </p>
      <textarea
        value={value}
        onChange={(e) => { onChange(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
        ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }}
        placeholder="Add a link, thread continuation, or extra context…"
        className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
        style={{ minHeight: "72px", overflow: "hidden", borderColor: "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
      />
      {value && platformLimits && platformLimits.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {platformLimits.map((p) => (
            <span key={p.platform} className="text-xs font-medium flex items-center gap-1"
              style={{ color: p.commentOver ? "#ef4444" : p.commentCount > p.limit * 0.8 ? "#f59e0b" : "#444" }}>
              <PlatformIcon platform={p.platform} size={11} /> {p.commentCount}/{p.limit}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

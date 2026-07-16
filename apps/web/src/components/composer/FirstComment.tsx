interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function FirstComment({ value, onChange }: Props) {
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
    </div>
  );
}

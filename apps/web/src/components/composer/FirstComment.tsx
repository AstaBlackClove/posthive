interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function FirstComment({ value, onChange }: Props) {
  return (
    <div className="border-b border-border px-6 pb-5 pt-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="section-label text-fg">First Comment</span>
        <span className="type-body-r-xxs px-1.5 py-0.5 rounded-full border border-border bg-surface text-muted">optional</span>
      </div>
      <p className="type-body-r-xs mb-2.5 text-muted">
        Posted as the first reply immediately after your post goes live.
      </p>
      <textarea
        value={value}
        onChange={(e) => { onChange(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
        ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }}
        placeholder="Add a link, thread continuation, or extra context…"
        className="field resize-none min-h-18 overflow-hidden"
      />
    </div>
  );
}

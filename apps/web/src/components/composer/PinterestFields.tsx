import { PlatformIcon } from "../PlatformIcon";

interface Props {
  pinterestTitle: string;
  onTitleChange: (v: string) => void;
  pinterestDescription: string;
  onDescriptionChange: (v: string) => void;
  onlyPinterest?: boolean;
}

export function PinterestFields({
  pinterestTitle, onTitleChange,
  pinterestDescription, onDescriptionChange,
  onlyPinterest,
}: Props) {
  return (
    <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 mb-1">
        <PlatformIcon platform="pinterest" size={13} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#e60023" }}>Pinterest</span>
      </div>
      <p className="text-xs mb-2.5" style={{ color: "#999" }}>
        Pins have a separate title and description.{!onlyPinterest && " Other selected platforms use the Caption above."}
      </p>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Pin title</span>
          <span className="text-[10px]" style={{ color: pinterestTitle.length > 100 ? "#ef4444" : "#444" }}>{pinterestTitle.length}/100</span>
        </div>
        <input
          value={pinterestTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Short, catchy pin title"
          maxLength={100}
          className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
          style={{ borderColor: pinterestTitle.length > 100 ? "#fca5a5" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Description</span>
          <span className="text-[10px]" style={{ color: pinterestDescription.length > 500 ? "#ef4444" : "#444" }}>{pinterestDescription.length}/500</span>
        </div>
        <textarea
          value={pinterestDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What is this Pin about?"
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
          style={{ borderColor: pinterestDescription.length > 500 ? "#fca5a5" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
        />
      </div>
    </div>
  );
}

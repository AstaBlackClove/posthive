import { PlatformIcon } from "../PlatformIcon";

interface Props {
  youtubeTitle: string;
  onTitleChange: (v: string) => void;
  youtubeDescription: string;
  onDescriptionChange: (v: string) => void;
  youtubeType: "short" | "video";
  onTypeChange: (v: "short" | "video") => void;
  youtubeVideoMode: "upload" | "url";
  onlyYoutube: boolean;
  video: { name: string } | null;
  youtubeShortsWarning?: string | null;
}

export function YoutubeFields({
  youtubeTitle, onTitleChange,
  youtubeDescription, onDescriptionChange,
  youtubeType, onTypeChange,
  youtubeVideoMode, onlyYoutube, video,
  youtubeShortsWarning,
}: Props) {
  return (
    <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <PlatformIcon platform="youtube" size={13} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#ff0000" }}>YouTube</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["short", "video"] as const).map((t) => (
            <button key={t} type="button" onClick={() => onTypeChange(t)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all"
              style={youtubeType === t
                ? { backgroundColor: "#ff000020", color: "#ff0000", border: "1px solid #ff000050" }
                : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs mb-2.5" style={{ color: "#999" }}>
        {youtubeType === "short"
          ? "Uploads to the Shorts shelf — separate title and description."
          : "Uploads as a regular video — separate title and description."}
        {!onlyYoutube && " Other selected platforms use the Caption above."}
      </p>

      {youtubeShortsWarning && (
        <p className="text-xs font-medium mb-2.5 flex items-start gap-1.5" style={{ color: "#f59e0b" }}>
          <span className="flex-shrink-0">⚠️</span>
          <span>{youtubeShortsWarning} YouTube classifies Shorts by the video itself (vertical, ≤60s) — #Shorts alone won't override that.</span>
        </p>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Title</span>
          <span className="text-[10px]" style={{ color: youtubeTitle.length > 100 ? "#ef4444" : "#444" }}>{youtubeTitle.length}/100</span>
        </div>
        <input
          value={youtubeTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Video title"
          className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
          style={{ borderColor: youtubeTitle.length > 100 ? "#fca5a5" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
        />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Description</span>
          <span className="text-[10px]" style={{ color: youtubeDescription.length > 5000 ? "#ef4444" : "#444" }}>{youtubeDescription.length}/5000</span>
        </div>
        <textarea
          value={youtubeDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Video description…"
          rows={3}
          className="w-full resize-none rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
          style={{ borderColor: youtubeDescription.length > 5000 ? "#fca5a5" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
        />
      </div>

      {video && youtubeVideoMode === "upload" && (
        <p className="text-xs" style={{ color: "#4ade80" }}>✓ {video.name}</p>
      )}
    </div>
  );
}

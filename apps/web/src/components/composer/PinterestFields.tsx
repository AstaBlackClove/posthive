import { PlatformIcon } from "../PlatformIcon";
import { cn } from "@/lib/cn";

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
    <div className="border-b border-border px-6 pb-5 pt-4">
      <div className="flex items-center gap-2 mb-1">
        <PlatformIcon platform="pinterest" size={13} />
        <span className="section-label text-[#e60023]">Pinterest</span>
      </div>
      <p className="type-body-r-xs mb-2.5 text-muted">
        Pins have a separate title and description.{!onlyPinterest && " Other selected platforms use the Caption above."}
      </p>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="section-label">Pin title</span>
          <span className={cn("type-body-r-xxs", pinterestTitle.length > 100 ? "text-red-600" : "text-neutral-500")}>{pinterestTitle.length}/100</span>
        </div>
        <input
          value={pinterestTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Short, catchy pin title"
          maxLength={100}
          className={cn("field", pinterestTitle.length > 100 && "border-red-300")}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="section-label">Description</span>
          <span className={cn("type-body-r-xxs", pinterestDescription.length > 500 ? "text-red-600" : "text-neutral-500")}>{pinterestDescription.length}/500</span>
        </div>
        <textarea
          value={pinterestDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What is this Pin about?"
          rows={3}
          maxLength={500}
          className={cn("field resize-none", pinterestDescription.length > 500 && "border-red-300")}
        />
      </div>
    </div>
  );
}

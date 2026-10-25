"use client";
import { useEffect, useState } from "react";
import { PlatformIcon } from "../PlatformIcon";
import { apiFetch } from "../../lib/api";

interface CreatorInfo {
  creatorNickname: string;
  creatorAvatarUrl: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
}

const ACCENT = "#25F4EE";

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors"
      style={{ backgroundColor: checked && !disabled ? ACCENT : "#2a2a2a", opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

interface Props {
  accountId: string;
  video: { name: string; duration?: number } | null;
  tiktokTitle: string;
  onTitleChange: (v: string) => void;
  privacyLevel: string;
  onPrivacyChange: (v: string) => void;
  disableComment: boolean;
  onDisableCommentChange: (v: boolean) => void;
  disableDuet: boolean;
  onDisableDuetChange: (v: boolean) => void;
  disableStitch: boolean;
  onDisableStitchChange: (v: boolean) => void;
  commercialEnabled: boolean;
  onCommercialEnabledChange: (v: boolean) => void;
  yourBrand: boolean;
  onYourBrandChange: (v: boolean) => void;
  brandedContent: boolean;
  onBrandedContentChange: (v: boolean) => void;
  consentChecked: boolean;
  onConsentChange: (v: boolean) => void;
}

export function TiktokFields({
  accountId, video,
  tiktokTitle, onTitleChange,
  privacyLevel, onPrivacyChange,
  disableComment, onDisableCommentChange,
  disableDuet, onDisableDuetChange,
  disableStitch, onDisableStitchChange,
  commercialEnabled, onCommercialEnabledChange,
  yourBrand, onYourBrandChange,
  brandedContent, onBrandedContentChange,
  consentChecked, onConsentChange,
}: Props) {
  const [info, setInfo] = useState<CreatorInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyTouched, setPrivacyTouched] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    // Reset synchronously on account change — never reset from the fetch's
    // .then(), which can resolve after the user has already picked a privacy
    // level and would silently wipe it out.
    setInfo(null);
    onPrivacyChange("");
    setPrivacyTouched(false);
    setLoading(true);
    setError(null);
    apiFetch<CreatorInfo>(`/accounts/${accountId}/tiktok/creator-info`)
      .then((data) => setInfo(data))
      .catch(() => setError("Could not load TikTok creator info — check your connection and try again."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const brandedPrivacyBlocked = brandedContent && privacyLevel === "SELF_ONLY";
  const showPrivacyError = privacyTouched && !privacyLevel;

  const consentText = (() => {
    if (brandedContent)
      return <>By posting, you agree to TikTok&apos;s <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer" style={{ color: ACCENT }}>Branded Content Policy</a> and <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" style={{ color: ACCENT }}>Music Usage Confirmation</a>.</>;
    return <>By posting, you agree to TikTok&apos;s <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" style={{ color: ACCENT }}>Music Usage Confirmation</a>.</>;
  })();

  return (
    <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon platform="tiktok" size={13} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#ededed" }}>TikTok</span>
        </div>
        {info && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ backgroundColor: "#141414", border: "1px solid #242424" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={info.creatorAvatarUrl} alt="" className="w-4 h-4 rounded-full" />
            <span className="text-[11px] font-medium" style={{ color: "#ccc" }}>@{info.creatorNickname}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: "#888" }}>
          <span className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${ACCENT}40`, borderTopColor: "transparent" }} />
          Loading TikTok account info…
        </div>
      )}
      {error && (
        <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ color: "#f87171", backgroundColor: "#2a1414", border: "1px solid #4a1f1f" }}>{error}</p>
      )}

      {info && info.maxVideoPostDurationSec > 0 && (
        <p className="text-[10px] mb-3" style={{ color: "#777" }}>
          Max video length for this account: {info.maxVideoPostDurationSec}s
          {video ? "" : " attach a video below"}
        </p>
      )}

      {/* Title */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#999" }}>Title</span>
          <span className="text-[10px]" style={{ color: tiktokTitle.length > 2200 ? "#ef4444" : "#666" }}>{tiktokTitle.length}/2200</span>
        </div>
        <input
          value={tiktokTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="TikTok caption / title"
          className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
          style={{ borderColor: "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
        />
      </div>

      {/* Privacy — pill buttons, no default */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#999" }}>Who can view this video</span>
          {showPrivacyError && <span className="text-[10px]" style={{ color: "#f87171" }}>Required</span>}
        </div>
        {!info && !loading ? (
          <p className="text-[11px]" style={{ color: "#666" }}>Connect account to load privacy options.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {(info?.privacyLevelOptions ?? []).map((opt) => {
              const isBlocked = brandedContent && opt === "SELF_ONLY";
              const isActive = privacyLevel === opt;
              return (
                <button key={opt} type="button" disabled={isBlocked}
                  onClick={() => { onPrivacyChange(opt); setPrivacyTouched(true); }}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                  style={isActive
                    ? { backgroundColor: `${ACCENT}20`, color: ACCENT, border: `1px solid ${ACCENT}60` }
                    : { backgroundColor: "#111111", color: isBlocked ? "#444" : "#999", border: `1px solid ${showPrivacyError ? "#4a1f1f" : "#1f1f1f"}`, opacity: isBlocked ? 0.5 : 1, cursor: isBlocked ? "not-allowed" : "pointer" }}>
                  {PRIVACY_LABELS[opt] ?? opt}
                </button>
              );
            })}
          </div>
        )}
        {brandedPrivacyBlocked && (
          <p className="text-[10px] mt-1.5" style={{ color: "#f59e0b" }}>Branded content visibility cannot be set to private.</p>
        )}
      </div>

      {/* Interaction toggles */}
      <div className="mb-4 rounded-xl p-3.5" style={{ backgroundColor: "#111111", border: "1px solid #1f1f1f" }}>
        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-2.5" style={{ color: "#999" }}>Allow</span>
        <div className="space-y-2.5">
          {([
            { key: "comment", label: "Comments", checked: !disableComment, apiDisabled: info?.commentDisabled, set: (v: boolean) => onDisableCommentChange(!v) },
            { key: "duet", label: "Duet", checked: !disableDuet, apiDisabled: info?.duetDisabled, set: (v: boolean) => onDisableDuetChange(!v) },
            { key: "stitch", label: "Stitch", checked: !disableStitch, apiDisabled: info?.stitchDisabled, set: (v: boolean) => onDisableStitchChange(!v) },
          ] as const).map((row) => (
            <div key={row.key} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: row.apiDisabled ? "#555" : "#ddd" }}>{row.label}</span>
                {row.apiDisabled && <span className="text-[10px]" style={{ color: "#666" }}>off in TikTok app settings</span>}
              </div>
              <Toggle checked={row.checked && !row.apiDisabled} disabled={!!row.apiDisabled} onChange={row.set} />
            </div>
          ))}
        </div>
      </div>

      {/* Commercial content disclosure */}
      <div className="mb-4 rounded-xl p-3.5" style={{ backgroundColor: "#111111", border: "1px solid #1f1f1f" }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#999" }}>Disclose commercial content</span>
          <Toggle checked={commercialEnabled} onChange={(v) => { onCommercialEnabledChange(v); if (!v) { onYourBrandChange(false); onBrandedContentChange(false); } }} />
        </div>
        {commercialEnabled && (
          <div className="mt-3 pt-3 space-y-2.5" style={{ borderTop: "1px solid #1f1f1f" }}>
            <label className="flex items-start gap-2.5 text-xs cursor-pointer" style={{ color: "#ccc" }}>
              <input type="checkbox" checked={yourBrand} onChange={(e) => onYourBrandChange(e.target.checked)} className="mt-0.5 accent-current" style={{ accentColor: ACCENT }} />
              <span><span className="font-medium" style={{ color: "#ededed" }}>Your Brand</span> - promoting yourself or your own business</span>
            </label>
            <label className="flex items-start gap-2.5 text-xs cursor-pointer" style={{ color: "#ccc" }}>
              <input type="checkbox" checked={brandedContent} onChange={(e) => onBrandedContentChange(e.target.checked)} className="mt-0.5" style={{ accentColor: ACCENT }} />
              <span><span className="font-medium" style={{ color: "#ededed" }}>Branded Content</span> - promoting another brand or third party</span>
            </label>
            {!yourBrand && !brandedContent && (
              <p className="text-[10px]" style={{ color: "#f59e0b" }}>Select at least one option to continue.</p>
            )}
            {(yourBrand || brandedContent) && (
              <p className="text-[10px] px-2.5 py-1.5 rounded-lg inline-block" style={{ color: "#999", backgroundColor: "#1a1a1a" }}>
                Labeled as &quot;{brandedContent ? "Paid partnership" : "Promotional content"}&quot;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Consent declaration */}
      <label className="flex items-start gap-2.5 text-[11px] cursor-pointer" style={{ color: "#999" }}>
        <input type="checkbox" checked={consentChecked} onChange={(e) => onConsentChange(e.target.checked)} className="mt-0.5" style={{ accentColor: ACCENT }} />
        <span>{consentText}</span>
      </label>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { canEditContent, canManageTemplates } from "../../lib/permissions";
import { PILLARS, categoriesFor, type Category, type Pillar } from "../../lib/contentTypes";
import { fileHref, isIncomplete, templatesByCategory, type DesignTemplate } from "../../lib/templates";
import { TemplateEditor } from "../../components/TemplateEditor";
import { DesignReferenceCard } from "../../components/DesignReferenceCard";
import { contentTypeLabel } from "../../components/ContentTypeSelects";
import { cn } from "../../lib/cn";

// Keyboard focus ring for template tiles (yellow accent is unreadable on cream, so brand-800)
const TILE_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-800";

type Group = Pillar | "No pillar";

// One-line pillar definitions from docs/content-types.md
const GROUP_SUMMARY: Record<Group, string> = {
  Promotional: "Products, services and client results that turn prospects into qualified leads.",
  Educational: "Geospatial insight, articles and how-tos that position Braga as a thought leader.",
  Entertainment: "Lighter, human moments such as CSR and behind the scenes, kept professional.",
  Conversational: "Polls, trend responses, events and commemorations that invite a reply.",
  "No pillar": "Ask Me Anything sits outside the four pillars.",
};

const GROUPS: Group[] = [...PILLARS, "No pillar"];
const categoriesOf = (g: Group) => categoriesFor(g === "No pillar" ? null : g);

export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const role = activeWorkspace?.role ?? user?.role;
  const canManage = canManageTemplates(role);
  const canUse = canEditContent(role);
  const { success: toastSuccess, error: toastError } = useToast();

  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [group, setGroup] = useState<Group | "all">("all");
  const [viewing, setViewing] = useState<DesignTemplate | null>(null);
  const [editing, setEditing] = useState<{ template: DesignTemplate | null; category?: Category } | null>(null);
  const [deleting, setDeleting] = useState<DesignTemplate | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    apiFetch<{ templates: DesignTemplate[] }>("/templates")
      .then((d) => setTemplates(d.templates))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, activeWorkspace?.id]);

  const byCategory = useMemo(() => templatesByCategory(templates), [templates]);
  const taken = useMemo(() => new Set(byCategory.keys()), [byCategory]);
  const sections = GROUPS.filter((g) => group === "all" || g === group);

  function saved(template: DesignTemplate) {
    setTemplates((prev) => [template, ...prev.filter((t) => t.id !== template.id)]);
    toastSuccess(editing?.template ? `Template for ${template.category} updated.` : `Template for ${template.category} saved.`);
    setEditing(null);
    setViewing(null);
  }

  async function remove() {
    if (!deleting) return;
    const { id, category } = deleting;
    setRemoving(true);
    try {
      await apiFetch(`/templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toastSuccess(`Template for ${category} deleted.`);
      setViewing(null);
    } catch {
      toastError("Couldn't delete the template.");
    } finally {
      setRemoving(false);
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg text-fg">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="type-body-sb-l">Templates</h1>
          <p className="type-body-r-xs mt-0.5 hidden sm:block truncate text-muted">
            {canManage
              ? "One design per content category. Marketing opens it as a reference when making a post."
              : "The design team's reference design for each content category."}
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setEditing({ template: null })}
            className="btn-primary gap-1.5 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New template
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div role="tablist" aria-label="Content pillar" className="flex flex-wrap gap-1 mb-8">
          {(["all", ...GROUPS] as const).map((g) => (
            <button key={g} type="button" role="tab" aria-selected={group === g} onClick={() => setGroup(g)}
              className={cn("chip px-3 py-1.5 type-body-m-s", group === g ? "chip-active" : "border-transparent bg-transparent")}>
              {g === "all" ? "All pillars" : g}
            </button>
          ))}
        </div>

        {loading && <p className="type-body-r-s text-muted">Loading templates…</p>}

        {!loading && loadError && (
          <div className="text-center py-16">
            <p className="type-body-r-s mb-4 text-muted">Templates didn&apos;t load. Check your connection and try again.</p>
            <button type="button" onClick={load} className="btn-primary">Try again</button>
          </div>
        )}

        {!loading && !loadError && (
          <div className="space-y-12">
            {sections.map((g) => {
              const categories = categoriesOf(g);
              const filled = categories.filter((c) => byCategory.has(c)).length;
              return (
                <section key={g} aria-labelledby={`pillar-${g}`}>
                  <div className="mb-4 max-w-[68ch]">
                    <h2 id={`pillar-${g}`} className="type-body-sb-m">
                      {g} <span className="type-body-r-s text-muted">{filled} of {categories.length}</span>
                    </h2>
                    <p className="type-body-r-s mt-0.5 text-muted">{GROUP_SUMMARY[g]}</p>
                  </div>
                  <ul className="grid gap-x-5 gap-y-7 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                    {categories.map((c) => {
                      const t = byCategory.get(c);
                      if (t) return <TemplateTile key={c} template={t} onOpen={() => setViewing(t)} />;
                      return <EmptySlot key={c} category={c} canManage={canManage} onUpload={() => setEditing({ template: null, category: c })} />;
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden while the editor or delete confirm is on top, so Esc only closes that layer */}
      {viewing && !editing && !deleting && (
        <TemplateDetail
          template={viewing}
          canManage={canManage}
          canUse={canUse}
          onClose={() => setViewing(null)}
          onUse={() => router.push(`/compose?template=${viewing.id}`)}
          onEdit={() => setEditing({ template: viewing })}
          onDelete={() => setDeleting(viewing)}
        />
      )}
      {editing && (
        <TemplateEditor template={editing.template} presetCategory={editing.category} takenCategories={taken}
          onClose={() => setEditing(null)} onSaved={saved} />
      )}
      {deleting && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/70"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !removing) setDeleting(null); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-template-title"
            className="card w-full max-w-sm p-5">
            <h2 id="delete-template-title" className="type-body-sb-s">Delete template</h2>
            <p className="type-body-r-s mt-2 text-muted">
              Delete the template for <span className="text-fg">{deleting.category}</span>? Its design file is removed and
              Marketing no longer sees a design reference for this category. Existing posts are not changed.
            </p>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setDeleting(null)} disabled={removing} autoFocus
                className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={remove} disabled={removing}
                className="btn-danger flex-1">
                {removing ? "Deleting…" : "Delete template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCover({ template }: { template: DesignTemplate }) {
  if (template.previewUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileHref(template.previewUrl)} alt="" className="w-full h-full object-cover" loading="lazy" />;
  }
  return (
    <span className="flex flex-col items-center gap-2 px-4 text-center">
      <span className="type-body-sb-xs px-2 py-1 rounded-sm bg-neutral-100 text-fg">
        {template.fileUrl ? "FIG" : "LINK"}
      </span>
      <span className="type-body-r-xs text-muted">No preview</span>
    </span>
  );
}

function TemplateTile({ template, onOpen }: { template: DesignTemplate; onOpen: () => void }) {
  const incomplete = isIncomplete(template);
  const parts = [template.fileUrl && "Figma file", template.linkUrl && "link"].filter(Boolean).join(" + ");
  return (
    <li>
      <button type="button" onClick={onOpen} className={cn("group w-full text-left rounded-2xl", TILE_FOCUS)}>
        <div className="card rounded-xl relative overflow-hidden flex items-center justify-center transition-colors aspect-4/5 group-hover:border-neutral-300">
          <TemplateCover template={template} />
          {incomplete && (
            <span className="absolute top-2 left-2 type-body-sb-xs px-1.5 py-0.5 rounded-sm bg-brand-100 text-brand-800 border border-brand-400">
              Incomplete
            </span>
          )}
        </div>
        <p className="type-body-sb-s mt-2.5 line-clamp-2">{template.category}</p>
        <p className="type-body-r-xs mt-0.5 text-muted">
          {incomplete ? "Needs a design file or link" : parts.charAt(0).toUpperCase() + parts.slice(1)}
        </p>
      </button>
    </li>
  );
}

function EmptySlot({ category, canManage, onUpload }: { category: Category; canManage: boolean; onUpload: () => void }) {
  const box = (
    <div className="dropzone bg-bg flex flex-col items-center justify-center gap-1 px-3 text-center aspect-4/5">
      {canManage
        ? <span className="type-body-m-s text-fg">+ Upload</span>
        : <span className="type-body-r-xs text-muted">No template yet</span>}
    </div>
  );
  return (
    <li>
      {canManage ? (
        <button type="button" onClick={onUpload} className={cn("w-full text-left rounded-2xl", TILE_FOCUS)} aria-label={`Upload the template for ${category}`}>
          {box}
          <p className="type-body-sb-s mt-2.5 line-clamp-2 text-muted">{category}</p>
        </button>
      ) : (
        <>
          {box}
          <p className="type-body-sb-s mt-2.5 line-clamp-2 text-muted">{category}</p>
        </>
      )}
    </li>
  );
}

function TemplateDetail({ template, canManage, canUse, onClose, onUse, onEdit, onDelete }: {
  template: DesignTemplate;
  canManage: boolean;
  canUse: boolean;
  onClose: () => void;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const updated = template.updatedAt ? new Date(template.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }) : null;

  return (
    <div className="fixed inset-0 z-900 flex items-center justify-center p-4 bg-black/75"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{`.template-detail :focus-visible { outline: 2px solid var(--color-brand-800); outline-offset: 2px; }`}</style>
      <div role="dialog" aria-modal="true" aria-label={`Template for ${template.category}`}
        className="template-detail card flex flex-col sm:flex-row overflow-hidden w-full max-w-190 max-h-[90vh]">
        <div className="sm:w-[42%] shrink-0 flex items-center justify-center p-4 bg-bg border-r border-border">
          <div className="w-full rounded-xl overflow-hidden flex items-center justify-center aspect-4/5 border border-border max-h-[40vh]">
            <TemplateCover template={template} />
          </div>
        </div>

        <div className="flex flex-col min-h-0 flex-1 min-w-0">
          <div className="flex items-start gap-3 px-5 pt-5 pb-4 shrink-0 border-b border-border">
            <div className="flex-1 min-w-0">
              <h2 className="type-body-sb-m text-fg">{template.category}</h2>
              <p className="type-body-r-xs mt-1 text-muted">
                {contentTypeLabel(template.category, template.pillar)}{updated ? `. Updated ${updated}` : ""}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-border text-muted">✕</button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
            <DesignReferenceCard template={template} category={template.category} />
            {isIncomplete(template) && canManage && (
              <p className="type-body-r-xs text-brand-800">Add the .fig file or a link so Marketing can open the design.</p>
            )}
          </div>

          {(canManage || canUse) && (
            <div className="flex gap-2 px-5 py-4 shrink-0 border-t border-border">
              {canManage && (
                <>
                  <button type="button" onClick={onDelete}
                    className="px-4 py-2 rounded-xl type-body-sb-s border border-red-200 text-red-600 transition-colors hover:bg-red-50">
                    Delete
                  </button>
                  <button type="button" onClick={onEdit}
                    className="btn-primary flex-1">
                    Edit template
                  </button>
                </>
              )}
              {canUse && (
                <button type="button" onClick={onUse}
                  className="btn-primary flex-1">
                  Use template
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

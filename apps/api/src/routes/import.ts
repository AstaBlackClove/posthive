import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getWorkspaceId, getUser, withAuth, requireContentEditorRole } from "../lib/auth/withAuth.js";
import {
  CsvParseError,
  decodeUtf8,
} from "../lib/import/csv.js";
import {
  CsvHeaderError,
  MAX_IMPORT_BYTES,
  parsePlanningCsv,
  type PlanningImportFormat,
} from "../lib/import/planningImport.js";
import {
  IMPORT_PLATFORMS,
  MAX_CAPTION,
  MAX_CATEGORY,
  MAX_TITLE,
  commitFromDrafts,
  reviewDrafts,
  type PlanningDraft,
  type PlanningEdits,
  type RowErrors,
} from "../lib/import/reviewRows.js";
import { XlsxParseError, parsePlanningXlsx } from "../lib/import/planningXlsx.js";

class ImportUploadError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = "IMPORT_ERROR") {
    super(message);
    this.name = "ImportUploadError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface ImportUpload {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  format: PlanningImportFormat;
  /** Rows kept in the batch (the others were removed in the review). */
  include?: number[];
  /** Fixes made in the review table, by file row number. */
  edits?: PlanningEdits;
}

interface ImportAccount {
  id: string;
  platform: string;
  displayName: string;
}

interface ResolvedTarget {
  accountId: string;
  platform: string;
  displayName: string;
}

function parseInclude(raw: string): number[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ImportUploadError("Field include harus berupa array nomor baris.");
  }
  const rows = z.array(z.number().int().min(1)).max(1000).safeParse(parsed);
  if (!rows.success) throw new ImportUploadError("Field include harus berisi nomor baris positif.");
  return [...new Set(rows.data)];
}

// The browser may send anything here, so it is checked, not trusted.
const editSchema = z.object({
  title: z.string().max(MAX_TITLE * 2).optional(),
  postDate: z.string().max(10).optional(),
  platforms: z.array(z.enum(IMPORT_PLATFORMS)).max(IMPORT_PLATFORMS.length).optional(),
  category: z.string().max(MAX_CATEGORY).nullable().optional(),
  caption: z.string().max(MAX_CAPTION).optional(),
}).strict();

function parseEdits(raw: string): PlanningEdits {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ImportUploadError("Field edits harus berupa objek JSON.");
  }
  const result = z.record(z.string().regex(/^\d+$/), editSchema).safeParse(parsed);
  if (!result.success) {
    throw new ImportUploadError("Field edits tidak valid.", 422, "IMPORT_INVALID");
  }
  return Object.fromEntries(
    Object.entries(result.data).map(([row, edit]) => [Number(row), edit]),
  ) as PlanningEdits;
}

async function readUpload(req: FastifyRequest): Promise<ImportUpload> {
  if (!req.isMultipart()) {
    throw new ImportUploadError("Upload file CSV atau XLSX sebagai multipart/form-data dengan field 'file'.");
  }

  let file: { buffer: Buffer; filename: string; mimetype: string } | null = null;
  let include: number[] | undefined;
  let edits: PlanningEdits | undefined;

  for await (const part of req.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "file") {
        part.file.resume();
        continue;
      }
      if (file) {
        part.file.resume();
        throw new ImportUploadError("Hanya satu file CSV/XLSX yang boleh diunggah.");
      }

      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of part.file) {
        total += chunk.length;
        if (total > MAX_IMPORT_BYTES) {
          throw new ImportUploadError(
            `File terlalu besar. Maksimum ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`,
            413,
            "FILE_TOO_LARGE",
          );
        }
        chunks.push(chunk);
      }

      file = {
        buffer: Buffer.concat(chunks),
        filename: part.filename ?? "",
        mimetype: part.mimetype,
      };
      continue;
    }

    if (part.fieldname === "include") include = parseInclude(String(part.value));
    if (part.fieldname === "edits") edits = parseEdits(String(part.value));
  }

  if (!file) {
    throw new ImportUploadError("File CSV atau XLSX wajib diunggah pada field 'file'.");
  }

  const filename = file.filename.toLowerCase();
  let format: PlanningImportFormat;

  if (filename.endsWith(".xlsx")) {
    format = "xlsx";
  } else if (filename.endsWith(".xls") || filename.endsWith(".xlsm")) {
    throw new ImportUploadError(
      "File Excel lama (.xls/.xlsm) belum didukung. Simpan ulang sebagai .xlsx atau CSV UTF-8.",
      415,
      "UNSUPPORTED_FILE_TYPE",
    );
  } else if (filename.endsWith(".csv")) {
    format = "csv";
  } else {
    throw new ImportUploadError(
      "Format file harus .csv atau .xlsx.",
      415,
      "UNSUPPORTED_FILE_TYPE",
    );
  }

  return { ...file, format, include, edits };
}

function resolveTargets(platforms: string[], accounts: ImportAccount[]): {
  targets: ResolvedTarget[];
  warnings: string[];
} {
  const targets: ResolvedTarget[] = [];
  const warnings: string[] = [];

  for (const platform of platforms) {
    if (platform === "website") continue;

    const matches = accounts.filter((account) => account.platform === platform);
    if (matches.length === 1) {
      const account = matches[0];
      targets.push({
        accountId: account.id,
        platform: account.platform,
        displayName: account.displayName,
      });
    } else if (matches.length === 0) {
      warnings.push(`Akun ${platform} belum terhubung; draft dibuat tanpa target.`);
    } else {
      warnings.push(
        `Ada ${matches.length} akun ${platform}; target tidak dipilih otomatis. Pilih akun manual sebelum scheduling.`,
      );
    }
  }

  return { targets, warnings };
}

async function prepareImport(workspaceId: string, req: FastifyRequest) {
  const upload = await readUpload(req);
  const parsed =
    upload.format === "xlsx"
      ? await parsePlanningXlsx(upload.buffer)
      : parsePlanningCsv(decodeUtf8(upload.buffer));

  const accounts = await prisma.account.findMany({
    where: { workspaceId },
    select: { id: true, platform: true, displayName: true },
    orderBy: { createdAt: "asc" },
  });

  return { upload, parsed, accounts };
}

/** Import keys of these rows (after edits) that the workspace already has. */
async function existingImportKeys(workspaceId: string, drafts: PlanningDraft[], edits: PlanningEdits | undefined) {
  const keys = reviewDrafts(drafts, { edits }).flatMap((row) => (row.importKey ? [row.importKey] : []));
  if (keys.length === 0) return new Set<string>();
  const found = await prisma.postJob.findMany({
    where: { workspaceId, importKey: { in: keys } },
    select: { importKey: true },
  });
  return new Set(found.flatMap((row) => (row.importKey ? [row.importKey] : [])));
}

function importError(reply: { status: (code: number) => { send: (body: unknown) => unknown } }, error: unknown) {
  if (error instanceof ImportUploadError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }
  if (error instanceof XlsxParseError) {
    return reply.status(400).send({ error: error.message, code: error.code });
  }
  if (error instanceof CsvParseError || error instanceof CsvHeaderError) {
    return reply.status(400).send({ error: error.message, code: "INVALID_CSV" });
  }
  throw error;
}

const isUniqueViolation = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";

export async function importRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/jobs/import/preview",
    { preHandler: [withAuth], config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { id: userId } = getUser(req);
      const workspaceId = getWorkspaceId(req);

      // Import is Admin + Marketing only (docs/role-access-matrix.md US-09)
      const roleBlocked = await requireContentEditorRole(userId, workspaceId);
      if (roleBlocked) return reply.status(403).send(roleBlocked);

      try {
        const { upload, parsed, accounts } = await prepareImport(workspaceId, req);
        const existing = await existingImportKeys(workspaceId, parsed.drafts, undefined);
        const reviewed = reviewDrafts(parsed.drafts, { existingKeys: existing });
        const draftByRow = new Map(parsed.drafts.map((draft) => [draft.sourceRow, draft]));

        const rows = reviewed.map((row) => {
          const draft = draftByRow.get(row.sourceRow) as PlanningDraft;
          return {
            sourceRow: row.sourceRow,
            status: row.status,
            fields: row.fields,
            errors: row.errors,
            warnings: row.warnings,
            duplicateReason: row.duplicateReason ?? null,
            // Columns the review does not edit, shown for context
            details: {
              platformLabel: draft.platformLabel ?? "",
              pillar: draft.extras.pillar,
              picContent: draft.extras.picContent,
              reviewer: draft.extras.reviewer,
              picDesign: draft.extras.picDesign,
              progress: draft.extras.progress,
              outputUrl: draft.extras.outputUrl,
              sourceStatus: draft.extras.sourceStatus,
              assetNotes: draft.extras.assetNotes,
              designCopyPreview: draft.extras.designCopy.slice(0, 500),
              designCopyLength: draft.extras.designCopy.length,
            },
          };
        });

        // Lets the table warn about a platform with no (or several) connected accounts after an edit
        const accountCount: Record<string, number> = {};
        for (const account of accounts) accountCount[account.platform] = (accountCount[account.platform] ?? 0) + 1;

        return reply.send({
          file: {
            name: upload.filename,
            format: parsed.format,
            delimiter: parsed.delimiter,
            sheetName: parsed.sheetName,
            candidateSheets: parsed.candidateSheets,
            headerRow: parsed.header.headerRow,
            subHeaderRow: parsed.header.subHeaderRow,
          },
          summary: {
            totalRows: parsed.totalDataRows,
            validRows: rows.filter((r) => r.status === "valid").length,
            invalidRows: rows.filter((r) => r.status === "invalid").length,
            duplicateRows: rows.filter((r) => r.status === "duplicate").length,
          },
          rows,
          accountCount,
        });
      } catch (error) {
        return importError(reply, error);
      }
    },
  );

  app.post(
    "/jobs/import/commit",
    { preHandler: [withAuth], config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { id: userId } = getUser(req);
      const workspaceId = getWorkspaceId(req);

      // Import is Admin + Marketing only (docs/role-access-matrix.md US-09)
      const roleBlocked = await requireContentEditorRole(userId, workspaceId);
      if (roleBlocked) return reply.status(403).send(roleBlocked);

      const refuse = (rows: RowErrors[], status: number) =>
        reply.status(status).send({
          error: "Beberapa baris belum valid. Tidak ada yang disimpan.",
          code: "IMPORT_INVALID",
          rows,
        });

      try {
        const { upload, parsed, accounts } = await prepareImport(workspaceId, req);
        if (!upload.include) throw new ImportUploadError("Field include wajib diisi.");

        // Same rules as the preview, run again on what the browser sent
        const existingKeys = await existingImportKeys(workspaceId, parsed.drafts, upload.edits);
        const plan = commitFromDrafts(parsed.drafts, { include: upload.include, edits: upload.edits, existingKeys });
        if (!plan.ok) return refuse(plan.rowErrors, 422);

        const importedAt = new Date().toISOString();
        type Created = { id: string; sourceRow: number; title: string; scheduledFor: string };
        let created: Created[];
        try {
          // All or nothing: one failed row saves none of them
          created = await prisma.$transaction(
            async (tx) => {
              const out: Created[] = [];
              for (const row of plan.rows) {
                const resolved = resolveTargets(row.platforms, accounts);
                const content = {
                  text: row.caption,
                  mediaUrls: [],
                  title: row.title,
                  designCopy: row.extras.designCopy,
                  designCopySource: "Link Copywrite",
                  captionSource: "Caption",
                  assetNotes: row.extras.assetNotes,
                  pillar: row.pillar,
                  category: row.category,
                  platforms: row.platforms,
                  platformLabel: row.platformLabel,
                  picContent: row.extras.picContent,
                  contentReview: row.extras.contentReview,
                  approvedBy: row.extras.approvedBy,
                  reviewer: row.extras.reviewer,
                  picDesign: row.extras.picDesign,
                  progress: row.extras.progress,
                  outputUrl: row.extras.outputUrl,
                  sourceStatus: row.extras.sourceStatus,
                  sourceRow: row.sourceRow,
                  importSource: {
                    fileName: upload.filename,
                    importedAt,
                    format: parsed.format,
                    delimiter: parsed.delimiter,
                    sheetName: parsed.sheetName,
                  },
                };
                const job = await tx.postJob.create({
                  data: {
                    scheduledFor: row.scheduledFor,
                    status: "draft",
                    content: JSON.stringify(content),
                    commentText: null,
                    dryRun: false,
                    approvalStatus: null,
                    userId,
                    workspaceId,
                    importKey: row.importKey,
                    ...(resolved.targets.length > 0
                      ? { targets: { create: resolved.targets.map((target) => ({ accountId: target.accountId })) } }
                      : {}),
                  },
                  select: { id: true },
                });
                out.push({ id: job.id, sourceRow: row.sourceRow, title: row.title, scheduledFor: row.scheduledFor.toISOString() });
              }
              return out;
            },
            { timeout: 60_000 },
          );
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          // Another import saved the same post a moment ago. Nothing was saved here.
          const taken = await existingImportKeys(workspaceId, parsed.drafts, upload.edits);
          const clashes = plan.rows
            .filter((row) => taken.has(row.importKey))
            .map((row) => ({
              sourceRow: row.sourceRow,
              errors: [{ field: "title" as const, message: "Sudah pernah diimpor ke workspace ini." }],
            }));
          if (clashes.length === 0) throw error;
          return refuse(clashes, 409);
        }

        return reply.status(201).send({
          summary: { totalRows: parsed.totalDataRows, created: created.length },
          jobs: created,
        });
      } catch (error) {
        return importError(reply, error);
      }
    },
  );
}

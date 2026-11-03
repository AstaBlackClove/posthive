# Content Plan CSV / XLSX Import (MVP)

Backend import for the marketing content plan. Valid rows become **draft** `PostJob` records so they appear on the calendar. Nothing is queued or published automatically.

## File requirements

- Format: `.csv` or `.xlsx` (legacy `.xls` and macro-enabled `.xlsm` are rejected)
- CSV encoding: UTF-8 (BOM allowed)
- CSV delimiter: comma or semicolon (auto-detected)
- XLSX: one sheet is selected automatically based on the required headers
- Maximum size: 5 MB
- Maximum data rows: 1,000
- Maximum XLSX sheets scanned: 50

### Export instructions

XLSX:

1. Upload the workbook directly.
2. The importer scans visible sheets and selects the one with `Content Title`, `Post Date`, and `Platform` headers. The selected sheet is shown in preview.

CSV from Excel:

1. Open the sheet that contains the content plan (`Worksheet` / `Worksheet 2` in the client file).
2. `File > Save As > CSV UTF-8 (Comma delimited) (*.csv)`.
3. Upload the resulting `.csv`.

CSV from Google Sheets:

1. Open the content-plan sheet.
2. `File > Download > Comma-separated values (.csv)`.
3. Upload the resulting `.csv`.

The importer accepts the client's two-row header. The first row may contain group headers such as `Category` / `Content Review`, and the second row may contain `Content Pillar`, `Content Category`, `Acc by`, `PIC Design`, etc.

## Columns

Required:

| Column | Use |
|---|---|
| `Content Title` | `content.title`, shown on the calendar |
| `Post Date` | `scheduledFor` |
| `Platform` | `content.platforms` and account targets |

Optional:

| Column | Use |
|---|---|
| `Content Pillar` | `content.pillar` |
| `Content Category` | `content.category` |
| `Link Copywrite` | `content.designCopy` (raw, preserved exactly) |
| `Caption` | `content.text` (caption final; optional) |
| `Aset Pendukung` | `content.assetNotes` (links/notes, not media uploads) |
| `PIC Content` | `content.picContent` |
| `Content Review` | `content.contentReview` |
| `Acc by` | `content.approvedBy` |
| `PIC Design` | `content.picDesign` |
| `Progress Content` | `content.progress` |
| `Link Output` | `content.outputUrl` |
| `Status` | `content.sourceStatus` |

Media is **not** in the Excel/CSV. The import leaves `content.mediaUrls` empty. `Link Copywrite` is design copy, not a caption. When the optional `Caption` column is present, its value is stored as `content.text`; when it is absent or empty, the draft is created without a caption. The client Excel copy places `Caption` in column N so the existing merged headers and drawings are not shifted.

## Date rules

- Preferred: `DD-MM-YYYY`
- Also accepted: `YYYY-MM-DD`, `DD/MM/YYYY`, `YYYY/MM/DD`
- XLSX date cells and raw Excel date serials are converted to a full date. Time is ignored.
- Ambiguous dates such as `01-02-2026` or `01/02/2026` are read as `DD-MM-YYYY` with a warning.
- Two-digit years such as `17/08/26` are rejected; use a four-digit year.
- No time column: default is **09:00 WIB**.
- Past dates are imported as archive drafts with a warning.

## Platform rules

| CSV / XLSX value | Stored platforms |
|---|---|
| `LinkedIn` / `LI` | `linkedin` |
| `Instagram` / `IG` | `instagram` |
| `Mirroring (LI&Ig)` / `LI & IG` | `linkedin`, `instagram` |
| `Website` | `website` (draft only; no social target) |

Unknown platforms make the row invalid.

If exactly one connected account exists for a platform, it is linked automatically. If none or more than one exists, the draft is still created without that target and a warning tells the user to choose an account manually.

## Endpoints

All endpoints require the normal auth cookie. Use the same workspace header as other app routes when needed (`x-workspace-id`).

### Preview

```http
POST /jobs/import/preview
Content-Type: multipart/form-data
```

Field:

- `file`: CSV or XLSX file

Response:

```json
{
  "file": {
    "name": "content-plan.xlsx",
    "format": "xlsx",
    "delimiter": null,
    "sheetName": "Content Plan",
    "candidateSheets": ["Content Plan"],
    "headerRow": 1,
    "subHeaderRow": 2
  },
  "summary": {
    "totalRows": 85,
    "validRows": 70,
    "invalidRows": 10,
    "duplicateRows": 5
  },
  "rows": [
    {
      "sourceRow": 84,
      "status": "invalid",
      "fields": { "title": "Row without platform", "postDate": "2026-10-22", "platforms": [], "category": "Case Study", "caption": "" },
      "errors": [{ "field": "platforms", "message": "Platform wajib diisi." }],
      "warnings": [],
      "duplicateReason": null,
      "details": { "platformLabel": "", "designCopyPreview": "", "designCopyLength": 0 }
    }
  ],
  "accountCount": { "linkedin": 1 }
}
```

Every non-blank row comes back, not only the valid ones. `status` is `valid`, `invalid` or `duplicate` (already imported into the workspace, or a copy of an earlier row in the file). `fields` are the five values the review table can edit; `errors` say what is wrong per field (`title`, `postDate`, `platforms`). `details` carries read-only columns for context; `designCopyPreview` is cut to 500 characters. `accountCount` is the number of connected accounts per platform.

### Commit

```http
POST /jobs/import/commit
Content-Type: multipart/form-data
```

Fields:

- `file`: the same CSV or XLSX file used for preview. It stays unchanged; fixes are sent separately.
- `include` (required): JSON array of the file row numbers to import, e.g. `[73,74]`. Rows left out are not saved.
- `edits` (optional): JSON object of fixes by row number, e.g. `{"73":{"title":"New title","postDate":"2026-10-22","platforms":["linkedin","instagram"],"category":"Case Study","caption":"..."}}`. Only these five fields can be edited; any other key is rejected.

The server re-parses the file, applies `edits`, and validates every included row again with the same rules as the preview (title, real calendar date, platform, duplicates in the batch and in the workspace). It does not trust the browser.

The import is all-or-nothing: the rows are saved in one transaction. If any included row is invalid or a duplicate, nothing is saved and the response lists the rows:

```json
{
  "error": "Beberapa baris belum valid. Tidak ada yang disimpan.",
  "code": "IMPORT_INVALID",
  "rows": [
    { "sourceRow": 84, "errors": [{ "field": "platforms", "message": "Platform wajib diisi." }] }
  ]
}
```

Status is `422`, or `409` when another import saved the same post a moment earlier. An unknown category is not an error; it is saved as written and `Send for Design Approval` asks for a valid one later.

Success response (`201`):

```json
{
  "summary": { "totalRows": 85, "created": 80 },
  "jobs": [
    {
      "id": "c...",
      "sourceRow": 73,
      "title": "Slope Stability Before the Rain Peaks",
      "scheduledFor": "2026-10-22T02:00:00.000Z"
    }
  ]
}
```

## Draft behavior

Imported rows are created with:

```text
status         = draft
approvalStatus = null
scheduledFor   = date at 09:00 WIB
commentText    = null
content.text   = caption from the Caption column (may be empty)
content.mediaUrls = []
```

No BullMQ job is created. The draft must be completed and scheduled manually.

The content JSON also stores:

```json
{
  "title": "...",
  "text": "Caption dari kolom Caption",
  "designCopy": "...",
  "designCopySource": "Link Copywrite",
  "captionSource": "Caption",
  "assetNotes": "...",
  "platforms": ["linkedin", "instagram"],
  "sourceStatus": "Published",
  "sourceRow": 73,
  "importSource": {
    "fileName": "content-plan.xlsx",
    "importedAt": "2026-10-22T12:00:00.000Z",
    "format": "xlsx",
    "delimiter": null,
    "sheetName": "Content Plan"
  }
}
```

`designCopy` is preserved exactly, including line breaks, quotes, and commas. It is intentionally not split into slides; future Figma placeholder mapping can build on this field without re-importing. `text` is the caption from the separate `Caption` column, so design copy stays clean.

## Duplicate prevention

`PostJob.importKey` is a SHA-256 hash of:

```text
normalized title | postDate | sorted platforms
```

There is a unique constraint on `[workspaceId, importKey]`. Re-importing the same plan returns `created: 0` for rows that already exist. Design-copy or caption changes do not create a duplicate, and the existing draft is not overwritten. To apply a new caption to an already-imported row, edit the draft or delete it and import again.

## Frontend notes

Minimal upload flow:

```ts
const body = new FormData();
body.append("file", file);

const preview = await fetch(`${API_BASE}/jobs/import/preview`, {
  method: "POST",
  credentials: "include",
  body, // do NOT set Content-Type manually
});

const commitBody = new FormData();
commitBody.append("file", file);
commitBody.append("include", JSON.stringify(includedRows));
commitBody.append("edits", JSON.stringify(edits)); // optional

await fetch(`${API_BASE}/jobs/import/commit`, {
  method: "POST",
  credentials: "include",
  body: commitBody,
});
```

`apiFetch` leaves `Content-Type` unset when the body is a `FormData` instance, so `apiFetch("/jobs/import/preview", { method: "POST", body })` works without extra headers.

- Imported drafts have `scheduledFor`, so the calendar should include them.
- Calendar/list titles should use `content.title` first, then `content.text`, then a fallback such as `Untitled`.
- A draft can have zero targets; don't treat that as an import failure.
- `Website` rows cannot be scheduled to a social account.
- Show `warnings` from preview and `skipped` from commit so users understand invalid/duplicate rows.
- The edit flow should let users edit the imported caption, add media, and accounts before scheduling. The existing `PATCH /jobs/:id` preserves unknown content JSON fields such as `designCopy`.

### Implemented page

- Route: `/jobs/import` (`apps/web/src/app/jobs/import/page.tsx`).
- Entry points: sidebar **Import Plan** and the **Import Plan** button on `/jobs`.
- Upload a CSV/XLSX or paste CSV, preview valid/invalid/duplicate rows, select valid rows, then commit the selection.
- Warnings and skipped rows stay visible in the preview table after commit.

## Out of scope

- Direct Google Sheets API integration
- Legacy `.xls` and macro-enabled `.xlsm` support
- Importing more than one XLSX sheet at once
- Caption generation
- Downloading media from Figma/Drive
- Automatic scheduling or publishing
- Splitting `designCopy` into Figma placeholders

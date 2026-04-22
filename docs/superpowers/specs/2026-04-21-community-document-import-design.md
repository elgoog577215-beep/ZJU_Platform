# AI Community Document Import Design

## Goal

Allow AI community post creation to import document content from `pdf`, `doc`, `docx`, and `md` files with one click, without typing content manually.

## Decisions

- Document import is separate from attachment upload in both UI and API.
- Imported documents fill the post body only and do not keep the original file as an attachment.
- Existing attachment upload stays on `/api/upload`.
- Document import uses a dedicated endpoint: `/api/community/posts/import-document`.
- `doc` and `docx` are parsed on the server so the feature does not depend on local Office tools.

## Backend

- Add a server-side parser utility for `pdf`, `doc`, `docx`, `md`, and `markdown`.
- Use `pdfjs-dist` for PDF extraction.
- Use `word-extractor` for legacy `.doc` and modern `.docx`.
- Normalize imported text into the community `content_blocks` shape.
- Return:
  - `title`
  - `plain_text`
  - `content_blocks`
  - `meta`
- Clean up uploaded import files after parsing so import does not create stored attachments.

## Frontend

- Add a dedicated `导入文档` button in `PostComposer`.
- Keep the existing attachment block flow unchanged.
- If the composer already contains content, confirm before replacing the body.
- Preserve imported block styles such as:
  - `heading`
  - `list`
  - `quote`
  - `code`

## Validation

- Accept only `pdf`, `doc`, `docx`, `md`, and `markdown`.
- Reject empty or non-importable documents.
- Keep auth required for import.

## Verification

- Static lint on touched files.
- Runtime module load check for the new import utility.
- Smoke test using a temporary Markdown file to confirm heading, list, and code block extraction.

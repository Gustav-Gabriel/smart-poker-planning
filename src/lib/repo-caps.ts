/** Shared caps for repo file contents sent to AI analysis (GitHub + local). */
export const MAX_FILES = 150;
/** Per-file ceiling (~80KB). */
export const MAX_FILE_BYTES = 81_920;
/** Total text budget (~1.5MB) — stays under typical free-tier Gemini comfort. */
export const MAX_TOTAL_BYTES = 1_572_864;

/** Statement photo import — the deep M4 feature from PLUTO.md: a photo of a
 *  bank statement becomes proposed transactions, reviewed before they hit
 *  the ledger. Needs the ai-proxy's `images` field (see SUITE-ARCHITECTURE.md
 *  §3 and chronos-audit's ai-proxy) — Gemini only, hosted or BYO key both
 *  work since both eventually call the same Gemini endpoint shape.
 */
import { loadSupabaseConfig } from "@/lib/supabase/client";
import type { Category, LedgerData } from "@/lib/ledger/types";

export interface ImportedRow {
  date: string;
  description: string;
  amountCents: number;
  direction: "in" | "out";
}

export interface ProposedRow extends ImportedRow {
  id: string;
  selected: boolean;
  categoryId: string | undefined;
  duplicate: boolean;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/** Downscale an image file client-side to ≤1600px on its longest edge and
 *  re-encode as JPEG — keeps the upload small and within the proxy's 4MB
 *  per-image guard without asking the user to resize anything themselves. */
export async function downscaleToJpegBase64(file: File): Promise<{ mimeType: string; dataBase64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", JPEG_QUALITY);
  });
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { mimeType: "image/jpeg", dataBase64: btoa(binary) };
}

const IMPORT_PROMPT = `You are reading a photo of a bank/wallet statement. Extract every transaction you can clearly read.
Return ONLY a single fenced block, exactly like:
\`\`\`transactions
[{"date":"2026-07-10","description":"Uber","amountCents":1550,"direction":"out"}]
\`\`\`
Rules: "date" is yyyy-MM-dd (infer the year from the statement if not printed); "amountCents" is a positive integer (R$15,50 = 1550), never negative; "direction" is "out" for money leaving the account (purchases, fees, transfers out) and "in" for money arriving (deposits, refunds, salary); "description" is the merchant/label text as printed, trimmed. Include no prose, no markdown outside the fence, nothing else — if you can't read any transactions, return an empty array.`;

/** One-shot call to the hosted ai-proxy with image parts. Not part of the
 *  streaming chat path — this is a single structured extraction, not a
 *  conversation turn. */
export async function extractTransactionsFromImages(images: { mimeType: string; dataBase64: string }[]): Promise<ImportedRow[]> {
  const cfg = loadSupabaseConfig();
  if (!cfg) throw new Error("The hosted AI isn't available (no Supabase project configured).");

  const res = await fetch(`${cfg.url.replace(/\/$/, "")}/functions/v1/ai-proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` },
    body: JSON.stringify({ provider: "gemini", prompt: IMPORT_PROMPT, images, temperature: 0.1, maxTokens: 2048 }),
  }).catch(() => {
    throw new Error("The hosted AI isn't reachable right now.");
  });
  if (!res.ok) {
    let detail = "";
    try { detail = ((await res.json()) as { error?: string }).error ?? ""; } catch { /* ignore */ }
    throw new Error(detail || `Statement import failed (${res.status})`);
  }
  const data = (await res.json()) as { text?: string };
  return parseImportedRows(data.text ?? "");
}

export function parseImportedRows(reply: string): ImportedRow[] {
  const match = reply.match(/```transactions\s*([\s\S]*?)```/) ?? reply.match(/```\s*([\s\S]*?)```/);
  const raw = match ? match[1] : reply;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((r): r is ImportedRow =>
    !!r && typeof r === "object" &&
    typeof (r as ImportedRow).date === "string" &&
    typeof (r as ImportedRow).description === "string" &&
    typeof (r as ImportedRow).amountCents === "number" && (r as ImportedRow).amountCents > 0 &&
    ((r as ImportedRow).direction === "in" || (r as ImportedRow).direction === "out"),
  );
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9à-ú ]/gi, "").trim();

/** Flags a row as a likely duplicate when an existing transaction shares the
 *  same date + amount and a similar description — never auto-merges, just
 *  pre-unchecks it so the user notices before re-importing something. */
function isLikelyDuplicate(data: LedgerData, row: ImportedRow): boolean {
  const normDesc = normalize(row.description);
  return data.transactions.some((t) => {
    if (t.date !== row.date || t.amountCents !== row.amountCents) return false;
    const existingDesc = normalize(t.description);
    return !!normDesc && !!existingDesc && (existingDesc.includes(normDesc) || normDesc.includes(existingDesc));
  });
}

/** Keyword match against category names — the same "heuristics first"
 *  pattern as everywhere else in Pluto; no AI call for this step. */
function guessCategory(categories: Category[], description: string): string | undefined {
  const normDesc = normalize(description);
  if (!normDesc) return undefined;
  const match = categories.find((c) => {
    const normName = normalize(c.name);
    return normName.length >= 3 && (normDesc.includes(normName) || normName.includes(normDesc));
  });
  return match?.id;
}

export function buildProposal(data: LedgerData, rows: ImportedRow[]): ProposedRow[] {
  const categories = data.categories.filter((c) => !c.archivedAt);
  return rows.map((row, i) => {
    const duplicate = isLikelyDuplicate(data, row);
    return {
      ...row,
      id: `import-${i}-${Date.now()}`,
      selected: !duplicate,
      categoryId: guessCategory(categories, row.description),
      duplicate,
    };
  });
}

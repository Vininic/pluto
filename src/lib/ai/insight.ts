/** AI-generated financial insight — tried first, with the deterministic
 *  heuristic (lib/ledger/insights.ts, lib/digest/generator.ts) as the
 *  fallback when it's unavailable or fails. Same "AI-first, heuristic-
 *  fallback" shape as Chronos' lib/digest/generator.ts: an LLM can notice
 *  things a fixed rule set can't (a trend across months, an odd cluster of
 *  transactions), while the heuristic guarantees the card is never empty
 *  and never blocks on a slow/unavailable provider. Every call is wrapped
 *  so a failure here is silent to the caller — null just means "use the
 *  heuristic", not an error state to surface. */
import { serializeLedger } from "./context";
import { streamChat, type ChatMessage } from "./providers";
import { loadAiSettings } from "./settings";
import type { LedgerData } from "@/lib/ledger/types";

async function callForJson<T>(systemPrompt: string, userPrompt: string, tag: string): Promise<T | null> {
  try {
    const settings = loadAiSettings();
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const raw = await streamChat(settings, messages, () => {});
    const match = raw.match(new RegExp("```" + tag + "\\s*([\\s\\S]*?)```"));
    if (!match) return null;
    return JSON.parse(match[1]) as T;
  } catch {
    return null;
  }
}

function ledgerContext(data: LedgerData, month: string): string {
  return `THE LEDGER (month ${month}):\n${serializeLedger(data, `${month}-01`)}`;
}

export interface AiHeadline {
  title: string;
  body: string;
  severity: "warning" | "positive";
}

/** For the Dashboard's always-visible single card — same 2-severity visual
 *  vocabulary AetherisInsightCard already has (no neutral "insight" state
 *  there, unlike the fuller digest below). */
export async function aiHeadlineInsight(data: LedgerData, month: string, localeLabel: string): Promise<AiHeadline | null> {
  const system = `You are Aetheris, analyzing this month's finances for Pluto's dashboard headline card. Look at the whole picture — budgets, goals, trends across months, unusual transactions — and pick the single most important thing to say right now, not necessarily whatever a fixed rule would flag first. Reply in ${localeLabel}.
Return ONLY a fenced \`\`\`headline block containing one JSON object: {"title": string (<=60 chars), "body": string (one sentence), "severity": "warning"|"positive"}. No prose outside the block, no markdown inside the strings.`;
  const result = await callForJson<AiHeadline>(system, ledgerContext(data, month), "headline");
  if (!result || typeof result.title !== "string" || typeof result.body !== "string") return null;
  if (result.severity !== "warning" && result.severity !== "positive") return null;
  return result;
}

export interface AiDigestCard {
  title: string;
  body: string;
  severity: "warning" | "positive" | "insight";
}

/** For the fuller Digest tab — up to 5 cards, the neutral "insight"
 *  severity included since the digest's own ReportCard/CARD_SEVERITY
 *  already supports it (spendingUp, uncategorizedPile, etc.). */
export async function aiDigestCards(data: LedgerData, month: string, localeLabel: string): Promise<AiDigestCard[] | null> {
  const system = `You are Aetheris, analyzing this month's finances for Pluto's full digest report. Reply in ${localeLabel}.
Return ONLY a fenced \`\`\`digest block containing a JSON array of up to 5 objects, most important first: {"title": string, "body": string, "severity": "warning"|"positive"|"insight"}. Look beyond fixed rules — trends across months, a category creeping up, a goal worth flagging, spending patterns a person reviewing their own finances would actually want to know about. No prose outside the block.`;
  const result = await callForJson<AiDigestCard[]>(system, ledgerContext(data, month), "digest");
  if (!Array.isArray(result)) return null;
  const valid = result.filter(
    (c): c is AiDigestCard =>
      !!c &&
      typeof c.title === "string" &&
      typeof c.body === "string" &&
      (c.severity === "warning" || c.severity === "positive" || c.severity === "insight"),
  );
  return valid.length > 0 ? valid : null;
}

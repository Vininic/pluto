/** A single rough price guess for one goal-item name — same heuristics-first,
 *  AI-second spirit as narrative.ts, but this one has no heuristic fallback
 *  since "what does this cost" isn't derivable from local data. The model has
 *  no live search/grounding, so this is explicitly a guess: the caller must
 *  show it as an editable suggestion, never auto-save it. */
import { streamChat } from "@/lib/ai/providers";
import { loadAiSettings } from "@/lib/ai/settings";

export async function estimateItemPriceCents(itemName: string): Promise<number | null> {
  const settings = loadAiSettings();
  const prompt = `Estimate the current typical retail price in Brazilian Reais (BRL) for this item: "${itemName}". Reply with ONLY a fenced block like this, no other text:\n\`\`\`price\n{"priceCents": 000000}\n\`\`\`\nUse your best rough estimate — it will be shown to the user as an editable suggestion, not a guarantee.`;
  const reply = await streamChat(settings, [{ role: "user", content: prompt }], () => {});
  const match = reply.match(/```price\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as { priceCents?: unknown };
    const cents = parsed.priceCents;
    return typeof cents === "number" && Number.isFinite(cents) && cents > 0 ? Math.round(cents) : null;
  } catch {
    return null;
  }
}

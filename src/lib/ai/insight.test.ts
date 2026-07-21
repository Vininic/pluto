import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LedgerData } from "@/lib/ledger/types";

const streamChatMock = vi.fn();
vi.mock("./providers", () => ({ streamChat: (...args: unknown[]) => streamChatMock(...args) }));
vi.mock("./settings", () => ({ loadAiSettings: () => ({ provider: "gemini-hosted" }) }));

import { aiHeadlineInsight, aiDigestCards } from "./insight";

function baseData(): LedgerData {
  return {
    wallets: [],
    categories: [],
    transactions: [],
    goals: [],
    budgets: [],
  } as unknown as LedgerData;
}

beforeEach(() => {
  streamChatMock.mockReset();
});

describe("aiHeadlineInsight", () => {
  it("parses a valid fenced headline block", async () => {
    streamChatMock.mockResolvedValue('```headline\n{"title":"Over budget","body":"You spent more than planned.","severity":"warning"}\n```');
    const result = await aiHeadlineInsight(baseData(), "2026-07", "Portuguese");
    expect(result).toEqual({ title: "Over budget", body: "You spent more than planned.", severity: "warning" });
  });

  it("returns null when there's no fenced block at all", async () => {
    streamChatMock.mockResolvedValue("Everything looks fine this month!");
    expect(await aiHeadlineInsight(baseData(), "2026-07", "Portuguese")).toBeNull();
  });

  it("returns null on malformed JSON instead of throwing", async () => {
    streamChatMock.mockResolvedValue("```headline\nnot json\n```");
    expect(await aiHeadlineInsight(baseData(), "2026-07", "Portuguese")).toBeNull();
  });

  it("returns null when severity isn't one of the two the dashboard card supports", async () => {
    streamChatMock.mockResolvedValue('```headline\n{"title":"X","body":"Y","severity":"insight"}\n```');
    expect(await aiHeadlineInsight(baseData(), "2026-07", "Portuguese")).toBeNull();
  });

  it("returns null when the provider call itself throws (offline, rate-limited, no key)", async () => {
    streamChatMock.mockRejectedValue(new Error("network error"));
    expect(await aiHeadlineInsight(baseData(), "2026-07", "Portuguese")).toBeNull();
  });
});

describe("aiDigestCards", () => {
  it("parses a valid fenced digest array, including the neutral severity", async () => {
    streamChatMock.mockResolvedValue(
      '```digest\n[{"title":"A","body":"B","severity":"warning"},{"title":"C","body":"D","severity":"insight"}]\n```',
    );
    const result = await aiDigestCards(baseData(), "2026-07", "Portuguese");
    expect(result).toEqual([
      { title: "A", body: "B", severity: "warning" },
      { title: "C", body: "D", severity: "insight" },
    ]);
  });

  it("drops individually malformed entries but keeps the valid ones", async () => {
    streamChatMock.mockResolvedValue(
      '```digest\n[{"title":"A","body":"B","severity":"warning"},{"title":"bad"}]\n```',
    );
    const result = await aiDigestCards(baseData(), "2026-07", "Portuguese");
    expect(result).toEqual([{ title: "A", body: "B", severity: "warning" }]);
  });

  it("returns null for an empty array (nothing usable to show)", async () => {
    streamChatMock.mockResolvedValue("```digest\n[]\n```");
    expect(await aiDigestCards(baseData(), "2026-07", "Portuguese")).toBeNull();
  });

  it("returns null when the block isn't a JSON array", async () => {
    streamChatMock.mockResolvedValue('```digest\n{"title":"not an array"}\n```');
    expect(await aiDigestCards(baseData(), "2026-07", "Portuguese")).toBeNull();
  });
});

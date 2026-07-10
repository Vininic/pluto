/** Pluto → Hermes bridge (write-only until Hermes exists to consume it).
 *
 *  Neither app writes another app's data. Pluto appends messages to a shared
 *  `user_data` row (key "hermes-outbox"); once Hermes ships it polls,
 *  delivers, and writes `sent`/`failed` back. Until then, messages just sit
 *  `pending` — honest, not a cron hack. Mirrors Kairos' `kairos-bridge`
 *  writer (`lib/bridge.ts`) — same shared-row append pattern.
 */
import { getSupabaseClient } from "@/lib/supabase/client";
import { makeId } from "@/lib/ledger/types";

const TABLE = "user_data";
export const OUTBOX_KEY = "hermes-outbox";

export interface OutboxMessage {
  id: string;
  source: "pluto" | "chronos" | "kairos" | "chiron";
  channel: "email" | "whatsapp" | "telegram";
  template: "monthly-report" | "budget-alert" | "digest" | "deadline-reminder" | "custom";
  subject: string;
  payload: Record<string, unknown>;
  status: "pending" | "sent" | "failed";
  createdAt: string;
  sentAt?: string;
  error?: string;
  attempts: number;
}

interface OutboxData {
  version: 1;
  messages: OutboxMessage[];
}

function emptyOutbox(): OutboxData {
  return { version: 1, messages: [] };
}

function coerce(raw: unknown): OutboxData {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as OutboxData).messages)) return emptyOutbox();
  return { version: 1, messages: (raw as OutboxData).messages };
}

/** Queue a monthly-report email for Hermes to eventually deliver. Returns an
 *  error message or null. Cloud accounts only — a guest session has no
 *  shared row to write into. */
export async function queueMonthlyReportEmail(subject: string, payload: Record<string, unknown>): Promise<string | null> {
  const sb = getSupabaseClient();
  if (!sb) return "Cloud is not configured";
  const { data: { session } } = await sb.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return "Sign in with your suite account to schedule delivery";

  const { data: row, error } = await sb
    .from(TABLE)
    .select("value")
    .eq("user_id", userId)
    .eq("key", OUTBOX_KEY)
    .maybeSingle();
  if (error) return error.message;

  const outbox = coerce(row?.value);
  outbox.messages = [
    ...outbox.messages.slice(-99),
    {
      id: makeId(),
      source: "pluto",
      channel: "email",
      template: "monthly-report",
      subject,
      payload,
      status: "pending",
      createdAt: new Date().toISOString(),
      attempts: 0,
    },
  ];

  const { error: upsertError } = await sb
    .from(TABLE)
    .upsert({ user_id: userId, key: OUTBOX_KEY, value: outbox, version: Date.now() }, { onConflict: "user_id,key" });
  return upsertError ? upsertError.message : null;
}

/** Calls the interim `report-mailer` Edge Function (see chronos-audit's
 *  supabase/functions/report-mailer) — sends ONLY to the caller's own
 *  verified account email, never a client-supplied address, so this passes
 *  the user's own session token, not the anon key. Cloud accounts only. */
import { getSupabaseClient, loadSupabaseConfig } from "@/lib/supabase/client";

export async function sendReportEmail(subject: string, html: string): Promise<string | null> {
  const cfg = loadSupabaseConfig();
  const sb = getSupabaseClient();
  if (!cfg || !sb) return "Cloud is not configured";

  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) return "Sign in with your suite account to send a report";

  let res: Response;
  try {
    res = await fetch(`${cfg.url.replace(/\/$/, "")}/functions/v1/report-mailer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.anonKey, Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ subject, html }),
    });
  } catch {
    return "The report mailer isn't reachable right now.";
  }
  if (!res.ok) {
    let detail = "";
    try { detail = ((await res.json()) as { error?: string }).error ?? ""; } catch { /* ignore */ }
    return detail || `Report mailer error ${res.status}`;
  }
  return null;
}

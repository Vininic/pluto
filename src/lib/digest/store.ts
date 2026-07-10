import type { Digest } from "./types";

const KEY = "pluto.digest.v1";

export function getDigest(): Digest | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Digest) : null;
  } catch {
    return null;
  }
}

export function setDigest(digest: Digest): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(digest));
  } catch {
    /* ignore */
  }
}

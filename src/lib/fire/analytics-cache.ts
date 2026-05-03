// src/lib/fire/analytics-cache.ts
import type { PortfolioAnalytics, ScoringProfile } from './api';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function cacheKey(portfolioId: string, profile: ScoringProfile): string {
  return `analytics-${portfolioId}-${profile}-${todayKey()}`;
}

export function getCachedAnalytics(portfolioId: string, profile: ScoringProfile): PortfolioAnalytics | null {
  try {
    const key = cacheKey(portfolioId, profile);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PortfolioAnalytics;
  } catch {
    try { localStorage.removeItem(cacheKey(portfolioId, profile)); } catch { /* ignore */ }
    return null;
  }
}

export function setCachedAnalytics(portfolioId: string, profile: ScoringProfile, data: PortfolioAnalytics): void {
  try {
    const today = todayKey();
    const key = `analytics-${portfolioId}-${profile}-${today}`;
    const prefix = `analytics-${portfolioId}-`;
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(prefix) && !k.endsWith(today)) {
        localStorage.removeItem(k);
      }
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage unavailable (SSR or quota) — silently skip
  }
}

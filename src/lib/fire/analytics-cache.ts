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
    const raw = localStorage.getItem(cacheKey(portfolioId, profile));
    if (!raw) return null;
    return JSON.parse(raw) as PortfolioAnalytics;
  } catch {
    return null;
  }
}

export function setCachedAnalytics(portfolioId: string, profile: ScoringProfile, data: PortfolioAnalytics): void {
  try {
    // Prune stale entries for this portfolio (different dates or profiles)
    const prefix = `analytics-${portfolioId}-`;
    const today = todayKey();
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix) && !key.endsWith(today)) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(cacheKey(portfolioId, profile), JSON.stringify(data));
  } catch {
    // localStorage unavailable (SSR or quota) — silently skip
  }
}

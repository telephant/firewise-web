export const COMMODITY_NAMES: Record<string, string> = {
  'GC=F': 'Gold',
  'SI=F': 'Silver',
  'PL=F': 'Platinum',
  'CL=F': 'Crude Oil',
};

export const COMMODITY_UNIT_LABELS: Record<string, string> = {
  'GC=F': 'troy oz',
  'SI=F': 'troy oz',
  'PL=F': 'troy oz',
  'CL=F': 'barrel',
};

export function isCommodity(market: string) {
  return market === 'COMMODITY';
}

export function displayTicker(ticker: string, market: string) {
  return isCommodity(market) ? (COMMODITY_NAMES[ticker] ?? ticker) : ticker;
}

export function displayUnit(ticker: string, market: string) {
  return isCommodity(market) ? (COMMODITY_UNIT_LABELS[ticker] ?? 'unit') : 'shares';
}

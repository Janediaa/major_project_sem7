// Utility for managing Google-style search history in localStorage

const DEFAULT_HISTORY = [
  { id: 'h1', query: 'Cardiologist in Delhi', path: '/doctor-hospital', timestamp: 'Recent' },
  { id: 'h2', query: 'Book OPD visit', path: '/appointments', timestamp: 'Recent' },
  { id: 'h3', query: 'Apollo Spectra Hospital', path: '/doctor-hospital', timestamp: '1d ago' },
  { id: 'h4', query: 'IRDAI waiting period', path: '/insurance', timestamp: '2d ago' },
];

const STORAGE_PREFIX = 'hn_search_history_';

export function getHistoryKey(userId = 'guest') {
  return `${STORAGE_PREFIX}${userId || 'guest'}`;
}

export function loadSearchHistory(userId = 'guest') {
  try {
    const key = getHistoryKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) {
      // Seed default search history for smooth demo experience
      localStorage.setItem(key, JSON.stringify(DEFAULT_HISTORY));
      return DEFAULT_HISTORY;
    }
    return JSON.parse(stored);
  } catch (err) {
    console.warn('Failed to load search history:', err);
    return DEFAULT_HISTORY;
  }
}

export function saveSearchItem(userId = 'guest', queryText, targetPath = null) {
  if (!queryText || !queryText.trim()) return;
  const clean = queryText.trim();
  const key = getHistoryKey(userId);

  try {
    const current = loadSearchHistory(userId);
    // Remove if already exists to push to front
    const filtered = current.filter(
      (item) => item.query.toLowerCase() !== clean.toLowerCase()
    );

    const newItem = {
      id: `sh_${Date.now()}`,
      query: clean,
      path: targetPath,
      timestamp: 'Just now',
    };

    const updated = [newItem, ...filtered].slice(0, 8); // Keep up to 8 recent searches
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save search history:', err);
  }
}

export function removeSearchItem(userId = 'guest', queryToRemove) {
  const key = getHistoryKey(userId);
  try {
    const current = loadSearchHistory(userId);
    const updated = current.filter(
      (item) => item.query.toLowerCase() !== queryToRemove.toLowerCase()
    );
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to delete search item:', err);
    return [];
  }
}

export function clearAllSearchHistory(userId = 'guest') {
  const key = getHistoryKey(userId);
  try {
    localStorage.setItem(key, JSON.stringify([]));
    return [];
  } catch (err) {
    console.warn('Failed to clear search history:', err);
    return [];
  }
}

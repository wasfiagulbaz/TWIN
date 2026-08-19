/**
 * Local search history — keyed per user email, stored in localStorage.
 * Same "swap this out later" story as AuthContext: once there's a real
 * backend, these three functions are the only thing that needs to move.
 */

function key(userEmail) {
  return `asa_history_${userEmail}`;
}

export function getHistory(userEmail) {
  if (!userEmail) return [];

  try {
    const raw = localStorage.getItem(key(userEmail));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(userEmail, entry) {
  if (!userEmail) return;

  const existing = getHistory(userEmail);
  const nextEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const next = [nextEntry, ...existing].slice(0, 50);
  localStorage.setItem(key(userEmail), JSON.stringify(next));

  return nextEntry;
}

export function clearHistory(userEmail) {
  if (!userEmail) return;
  localStorage.removeItem(key(userEmail));
}

const NAMESPACE = "af-ev-cache-v1";

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(NAMESPACE) || "{}");
  } catch {
    return {};
  }
}
function saveAll(obj) {
  localStorage.setItem(NAMESPACE, JSON.stringify(obj));
}

/**
 * setCache('teamStats', key, data, ttlMs)
 */
export function setCache(bucket, key, data, ttlMs = 1000 * 60 * 60 * 2) {
  const all = getAll();
  const now = Date.now();
  all[bucket] = all[bucket] || {};
  all[bucket][key] = { data, exp: now + ttlMs };
  saveAll(all);
}
export function getCache(bucket, key) {
  const all = getAll();
  const entry = all?.[bucket]?.[key];
  if (!entry) return null;
  if (Date.now() > entry.exp) return null;
  return entry.data;
}

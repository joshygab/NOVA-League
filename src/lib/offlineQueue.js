const key = 'nova-offline-queue'
const snapshotsKey = 'nova-offline-match-snapshots'

export function readOfflineQueue() {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

export function queueOfflineAction(action) {
  const rows = readOfflineQueue()
  const dedupeKey = action.dedupe_key || action.payload?.event?.client_event_id || action.payload?.event?.client_event_id || action.payload?.client_event_id
  if (dedupeKey && rows.some((item) => item.dedupe_key === dedupeKey || item.payload?.event?.client_event_id === dedupeKey)) {
    return rows.find((item) => item.dedupe_key === dedupeKey || item.payload?.event?.client_event_id === dedupeKey)
  }
  const next = [
    {
      id: crypto.randomUUID(),
      dedupe_key: dedupeKey || null,
      created_at: new Date().toISOString(),
      status: 'pending',
      ...action,
    },
    ...rows,
  ]
  window.localStorage.setItem(key, JSON.stringify(next))
  window.dispatchEvent(new Event('nova-offline-queue'))
  return next[0]
}

export function removeOfflineAction(id) {
  const next = readOfflineQueue().filter((item) => item.id !== id)
  window.localStorage.setItem(key, JSON.stringify(next))
  window.dispatchEvent(new Event('nova-offline-queue'))
  return next
}

export function updateOfflineAction(id, patch) {
  const next = readOfflineQueue().map((item) => item.id === id ? { ...item, ...patch, updated_at: new Date().toISOString() } : item)
  window.localStorage.setItem(key, JSON.stringify(next))
  window.dispatchEvent(new Event('nova-offline-queue'))
  return next
}

export function clearOfflineQueue() {
  window.localStorage.removeItem(key)
  window.dispatchEvent(new Event('nova-offline-queue'))
}

export function saveOfflineMatchSnapshot(matchId, snapshot) {
  const snapshots = readOfflineMatchSnapshots()
  snapshots[matchId] = {
    ...snapshot,
    saved_at: new Date().toISOString(),
  }
  window.localStorage.setItem(snapshotsKey, JSON.stringify(snapshots))
}

export function readOfflineMatchSnapshot(matchId) {
  return readOfflineMatchSnapshots()[matchId] || null
}

function readOfflineMatchSnapshots() {
  try {
    return JSON.parse(window.localStorage.getItem(snapshotsKey) || '{}')
  } catch {
    return {}
  }
}

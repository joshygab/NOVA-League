const key = 'nova-offline-queue'

export function readOfflineQueue() {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

export function queueOfflineAction(action) {
  const rows = readOfflineQueue()
  const next = [
    {
      id: crypto.randomUUID(),
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

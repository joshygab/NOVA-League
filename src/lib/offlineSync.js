import { saveDigitalMatchEvent, saveRefereeAttendance, saveRefereeMatchEvent, updateMatchLiveState, voidRefereeMatchEvent } from './adminApi'
import { readOfflineQueue, removeOfflineAction, updateOfflineAction } from './offlineQueue'

export async function syncOfflineQueue() {
  if (!navigator.onLine) return { synced: 0, failed: readOfflineQueue().length, error: 'Sin conexión.' }

  const rows = readOfflineQueue()
    .filter((item) => item.status !== 'syncing')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  let synced = 0
  let failed = 0

  for (const item of rows) {
    updateOfflineAction(item.id, { status: 'syncing', last_error: null })
    const result = await syncOfflineAction(item)
    if (result.error) {
      failed += 1
      const message = result.error.message || 'No se pudo sincronizar.'
      const conflict = /duplicate|unique|version|conflict/i.test(message)
      updateOfflineAction(item.id, { status: conflict ? 'conflict' : 'pending', last_error: message })
    } else {
      synced += 1
      removeOfflineAction(item.id)
    }
  }

  return { synced, failed, error: null }
}

async function syncOfflineAction(item) {
  if (item.type === 'match_event') return saveDigitalMatchEvent(item.payload)
  if (item.type === 'attendance_checkin') return saveRefereeAttendance(item.payload)
  if (item.type === 'match_live_state') return updateMatchLiveState(item.payload.matchId, item.payload.patch, item.payload.reason)
  if (item.type === 'referee_match_event') return saveRefereeMatchEvent(item.payload)
  if (item.type === 'void_referee_match_event') return voidRefereeMatchEvent(item.payload)
  return { error: { message: `Tipo de acción no soportado: ${item.type}` } }
}

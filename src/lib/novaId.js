export function formatNovaId(seed) {
  const value = String(seed || '').replace(/\D/g, '').slice(-6).padStart(6, '0')
  return `NVL-${value}`
}

export function playerNovaId(player, index = 0) {
  return player?.nova_id || formatNovaId(index + 1 || player?.number || player?.id)
}

export function novaIdPayload(player, index = 0, origin = window.location.origin) {
  const novaId = playerNovaId(player, index)
  return `nova://player/${novaId}|${origin}/nova-id/${novaId}`
}

export function qrImageUrl(value, size = 260) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(value)}`
}

export function parseNovaId(raw) {
  const text = String(raw || '').trim()
  const match = text.match(/NVL-\d{6}/i)
  return match ? match[0].toUpperCase() : text.toUpperCase()
}

export function shortPosition(position = '') {
  const normalized = position.toLowerCase()
  if (normalized.includes('porter')) return 'POR'
  if (normalized.includes('def')) return 'DEF'
  if (normalized.includes('medio') || normalized.includes('med')) return 'MED'
  if (normalized.includes('del') || normalized.includes('extremo')) return 'DEL'
  return position.slice(0, 3).toUpperCase() || 'N/D'
}

export function playerStatus(player, stats) {
  if (stats?.activeSanctions?.length) return { label: 'Suspendido', tone: 'red', icon: '🔴' }
  if (player?.status === 'injured') return { label: 'Lesionado', tone: 'yellow', icon: '🟡' }
  return { label: 'Activo', tone: 'green', icon: '🟢' }
}

function clamp(value, min = 35, max = 99) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function calculateNovaRating(player = {}, teamStanding = null) {
  const played = player.playedMatches || 0
  const goals = player.goals || 0
  const assists = player.assists || 0
  const mvp = player.mvpAwards || 0
  const cards = (player.yellowCards || 0) + (player.redCards || 0) * 2
  const wins = teamStanding?.won || 0
  const cleanSheets = player.cleanSheets || 0

  const shooting = clamp(50 + goals * 7 + mvp * 2)
  const passing = clamp(50 + assists * 8 + mvp * 2)
  const physical = clamp(52 + played * 3 + Math.min(12, wins * 2))
  const defending = clamp(50 + cleanSheets * 7 + Math.max(0, 12 - cards * 3))
  const pace = clamp(54 + played * 2 + goals + assists + mvp * 3)
  const fairPlay = clamp(75 - cards * 6 + played)
  const overall = clamp((pace * 0.18) + (shooting * 0.22) + (passing * 0.18) + (defending * 0.16) + (physical * 0.16) + (fairPlay * 0.1))

  return { overall, pace, shooting, passing, defending, physical, fairPlay }
}

export const achievementCatalog = [
  { id: 'debut', icon: '🥇', name: 'Debut NOVA', description: 'Primer partido jugado', unlocked: (p) => p.playedMatches >= 1 },
  { id: 'first_goal', icon: '⚽', name: 'Primer Gol NOVA', description: 'Anota su primer gol', unlocked: (p) => p.goals >= 1 },
  { id: 'hat_trick', icon: '🔥', name: 'Hat-Trick', description: '3 goles en un mismo partido', unlocked: (p) => (p.goalHistory || []).some((goal) => (p.goalHistory || []).filter((row) => row.match_id === goal.match_id).length >= 3) },
  { id: 'first_assist', icon: '🎯', name: 'Primer Asistencia', description: 'Registra su primera asistencia', unlocked: (p) => p.assists >= 1 },
  { id: 'crack', icon: '⭐', name: 'Crack NOVA', description: '5 MVP ganados', unlocked: (p) => p.mvpAwards >= 5 },
  { id: 'scoring_streak', icon: '🔥', name: 'Racha Goleadora', description: 'Anota en 5 partidos', unlocked: (p) => new Set((p.goalHistory || []).map((goal) => goal.match_id)).size >= 5 },
  { id: 'wall', icon: '🧱', name: 'Muro Defensivo', description: '5 porterías en cero', unlocked: (p) => (p.cleanSheets || 0) >= 5 },
  { id: 'legend', icon: '👑', name: 'Leyenda NOVA', description: '100 partidos jugados', unlocked: (p) => p.playedMatches >= 100 },
  { id: 'fair_play', icon: '🏅', name: 'Fair Play', description: '10 partidos sin tarjetas', unlocked: (p) => p.playedMatches >= 10 && (p.totalCards || 0) === 0 },
]

export function getPlayerAchievements(player) {
  return achievementCatalog.map((achievement) => ({ ...achievement, unlocked: achievement.unlocked(player) }))
}

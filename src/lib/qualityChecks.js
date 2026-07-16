export function buildQualityReport(league) {
  const assignmentsByMatch = new Map((league.matchAssignments || []).map((item) => [item.match_id, item]))
  const issues = [
    ...league.teams.filter((team) => !team.crest_url).map((team) => issue('Equipos sin escudo', team.name, 'equipos')),
    ...league.players.filter((player) => !player.photo_url && player.approval_status === 'approved').map((player) => issue('Jugadores sin foto', player.name, 'jugadores')),
    ...league.matches.filter((match) => !match.match_date).map((match) => issue('Partidos sin fecha', matchLabel(match, league), 'partidos')),
    ...league.matches.filter((match) => !match.venue).map((match) => issue('Partidos sin cancha', matchLabel(match, league), 'partidos')),
    ...league.matches.filter((match) => !assignmentsByMatch.get(match.id)?.referee_id).map((match) => issue('Partidos sin árbitro', matchLabel(match, league), 'partidos')),
    ...league.reports.filter((report) => report.status !== 'finalized' && report.status !== 'official').map((report) => issue('Actas sin cerrar', matchLabel(league.matches.find((match) => match.id === report.match_id), league), 'actas')),
    ...league.goals.filter((goal) => !goal.player_id).map((goal) => issue('Goles sin autor', goal.match_id, 'estadisticas')),
    ...league.sanctions.filter((sanction) => !sanction.reason || !sanction.sanction_type).map((sanction) => issue('Sanciones incompletas', sanction.id, 'sanciones')),
  ]

  const metrics = {
    teams: league.teams.length,
    players: league.players.filter((player) => player.approval_status === 'approved').length,
    matches: league.matches.length,
    unresolvedIssues: issues.length,
    divisions: league.divisions.length,
    activeSanctions: league.sanctions.filter((sanction) => sanction.status === 'active').length,
  }

  return { issues, metrics }
}

function issue(type, label, module) {
  return { id: `${type}-${label}`, type, label, module }
}

function matchLabel(match, league) {
  if (!match) return 'Partido'
  return `J${match.round} ${league.teamsById.get(match.home_team_id)?.name || 'Local'} vs ${league.teamsById.get(match.away_team_id)?.name || 'Visitante'}`
}

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buildMvpRanking, buildPlayerStats, calculateStandings } from './standings'

export function divisionSlug(division) {
  return division?.slug || division?.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || division?.id
}

export function useDivisionLeague(league) {
  const [searchParams, setSearchParams] = useSearchParams()
  const divisions = (league.divisions || []).filter((division) => division.active !== false)
  const selectedParam = searchParams.get('division')
  const selectedDivision = divisions.find((division) => divisionSlug(division) === selectedParam || division.id === selectedParam) || divisions[0] || null

  function setDivision(division) {
    const next = new URLSearchParams(searchParams)
    if (division) next.set('division', divisionSlug(division))
    else next.delete('division')
    setSearchParams(next, { replace: true })
  }

  const filteredLeague = useMemo(() => filterLeagueByDivision(league, selectedDivision), [league, selectedDivision?.id])
  return { divisions, selectedDivision, setDivision, filteredLeague }
}

export function filterLeagueByDivision(league, division) {
  if (!division) return league

  const teams = league.teams.filter((team) => team.division_id === division.id)
  const teamIds = new Set(teams.map((team) => team.id))
  const players = league.players.filter((player) => teamIds.has(player.team_id) || player.division_id === division.id)
  const playerIds = new Set(players.map((player) => player.id))
  const matches = league.matches.filter((match) => {
    if (match.division_id) return match.division_id === division.id
    return teamIds.has(match.home_team_id) && teamIds.has(match.away_team_id)
  })
  const matchIds = new Set(matches.map((match) => match.id))
  const goals = league.goals.filter((goal) => goal.division_id === division.id || matchIds.has(goal.match_id) || teamIds.has(goal.team_id))
  const events = league.events.filter((event) => event.division_id === division.id || matchIds.has(event.match_id) || teamIds.has(event.team_id))
  const cards = league.cards.filter((card) => card.division_id === division.id || matchIds.has(card.match_id) || teamIds.has(card.team_id))
  const sanctions = league.sanctions.filter((sanction) => sanction.division_id === division.id || teamIds.has(sanction.team_id) || playerIds.has(sanction.player_id))
  const playoffMatches = league.playoffMatches.filter((match) => {
    if (match.division_id) return match.division_id === division.id
    return teamIds.has(match.home_team_id) && teamIds.has(match.away_team_id)
  })
  const teamsById = new Map(teams.map((team) => [team.id, team]))
  const playersById = new Map(players.map((player) => [player.id, player]))
  const standings = calculateStandings(teams, matches)
  const playerStats = buildPlayerStats(players, goals, events, cards, matches, sanctions)
  const playerStatsById = new Map(playerStats.map((player) => [player.id, player]))
  const mvpRanking = buildMvpRanking(players, matches)

  return {
    ...league,
    teams,
    players,
    matches,
    goals,
    events,
    cards,
    sanctions,
    playoffMatches,
    teamsById,
    playersById,
    standings,
    playerStats,
    playerStatsById,
    mvpRanking,
    selectedDivision: division,
  }
}

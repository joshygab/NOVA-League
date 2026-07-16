import { useEffect, useMemo, useState } from 'react'
import { fetchLeagueData, subscribeToLeagueChanges } from './data'
import { buildMvpRanking, buildPlayerStats, calculateDivisionStandings, calculateStandings } from './standings'

export function useLeagueData() {
  const [data, setData] = useState({ divisions: [], seasonHistory: [], teams: [], players: [], matches: [], goals: [], events: [], cards: [], lineups: [], reports: [], matchRoster: [], captainAttendance: [], clarifications: [], venues: [], referees: [], matchAssignments: [], financeEntries: [], notifications: [], teamOfWeek: [], rosterMovements: [], sanctions: [], playoffMatches: [], news: [], gallery: [], novaChampions: { settings: null, qualifiedTeams: [], matches: [], stats: [], history: [] }, championSpotlight: null, championHistory: [], settings: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      setError('')
      const next = await fetchLeagueData()
      setData(next)
    } catch (err) {
      setError(err.message || 'No se pudo cargar la liga')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    return subscribeToLeagueChanges(load)
  }, [])

  const allPlayers = data.players
  const publicPlayers = useMemo(() => allPlayers.filter((player) => !player.approval_status || player.approval_status === 'approved'), [allPlayers])
  const teamsById = useMemo(() => new Map(data.teams.map((team) => [team.id, team])), [data.teams])
  const divisionsById = useMemo(() => new Map(data.divisions.map((division) => [division.id, division])), [data.divisions])
  const playersById = useMemo(() => new Map(data.players.map((player) => [player.id, player])), [data.players])
  const publicPlayersById = useMemo(() => new Map(publicPlayers.map((player) => [player.id, player])), [publicPlayers])
  const standings = useMemo(() => calculateStandings(data.teams, data.matches), [data.teams, data.matches])
  const divisionTables = useMemo(() => calculateDivisionStandings(data.divisions, data.teams, data.matches), [data.divisions, data.teams, data.matches])
  const playerStats = useMemo(
    () => buildPlayerStats(data.players, data.goals, data.events, data.cards, data.matches, data.sanctions),
    [data.players, data.goals, data.events, data.cards, data.matches, data.sanctions],
  )
  const playerStatsById = useMemo(() => new Map(playerStats.map((player) => [player.id, player])), [playerStats])
  const mvpRanking = useMemo(() => buildMvpRanking(data.players, data.matches), [data.players, data.matches])
  const novaChampionsTeamIds = useMemo(() => new Set((data.novaChampions?.qualifiedTeams || []).map((row) => row.team_id)), [data.novaChampions?.qualifiedTeams])

  return { ...data, allPlayers, publicPlayers, publicPlayersById, loading, error, standings, divisionTables, playerStats, playerStatsById, mvpRanking, teamsById, divisionsById, playersById, novaChampionsTeamIds, reload: load }
}

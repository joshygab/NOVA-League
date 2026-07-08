import { useEffect, useMemo, useState } from 'react'
import { fetchLeagueData, subscribeToLeagueChanges } from './data'
import { buildMvpRanking, buildPlayerStats, calculateStandings } from './standings'

export function useLeagueData() {
  const [data, setData] = useState({ teams: [], players: [], matches: [], goals: [], events: [], cards: [], sanctions: [], playoffMatches: [], news: [], gallery: [], settings: null })
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

  const teamsById = useMemo(() => new Map(data.teams.map((team) => [team.id, team])), [data.teams])
  const playersById = useMemo(() => new Map(data.players.map((player) => [player.id, player])), [data.players])
  const standings = useMemo(() => calculateStandings(data.teams, data.matches), [data.teams, data.matches])
  const playerStats = useMemo(
    () => buildPlayerStats(data.players, data.goals, data.events, data.cards, data.matches, data.sanctions),
    [data.players, data.goals, data.events, data.cards, data.matches, data.sanctions],
  )
  const playerStatsById = useMemo(() => new Map(playerStats.map((player) => [player.id, player])), [playerStats])
  const mvpRanking = useMemo(() => buildMvpRanking(data.players, data.matches), [data.players, data.matches])

  return { ...data, loading, error, standings, playerStats, playerStatsById, mvpRanking, teamsById, playersById, reload: load }
}

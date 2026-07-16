export function calculateStandings(teams = [], matches = []) {
  const table = new Map(
    teams.map((team) => [
      team.id,
      {
        ...team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ]),
  )

  matches
    .filter((match) => isCountedMatch(match) && Number.isFinite(match.home_score) && Number.isFinite(match.away_score))
    .forEach((match) => {
      const home = table.get(match.home_team_id)
      const away = table.get(match.away_team_id)
      if (!home || !away) return

      home.played += 1
      away.played += 1
      home.goalsFor += match.home_score
      home.goalsAgainst += match.away_score
      away.goalsFor += match.away_score
      away.goalsAgainst += match.home_score

      if (match.home_score > match.away_score) {
        home.won += 1
        away.lost += 1
        home.points += 3
      } else if (match.home_score < match.away_score) {
        away.won += 1
        home.lost += 1
        away.points += 3
      } else {
        home.drawn += 1
        away.drawn += 1
        home.points += 1
        away.points += 1
      }
    })

  return [...table.values()]
    .map((team) => ({
      ...team,
      goalDifference: team.goalsFor - team.goalsAgainst,
    }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name))
}

export function calculateDivisionStandings(divisions = [], teams = [], matches = []) {
  const fallbackDivision = divisions[0]
  return divisions.map((division) => {
    const divisionTeams = teams.filter((team) => (team.division_id || fallbackDivision?.id) === division.id)
    const divisionTeamIds = new Set(divisionTeams.map((team) => team.id))
    const divisionMatches = matches.filter((match) => divisionTeamIds.has(match.home_team_id) && divisionTeamIds.has(match.away_team_id))
    const standings = calculateStandings(divisionTeams, divisionMatches)
    return {
      ...division,
      teams: divisionTeams,
      matches: divisionMatches,
      standings: markDivisionZones(standings, division),
    }
  })
}

export function markDivisionZones(standings, division) {
  const promotionSlots = Number(division.promotion_slots || 0)
  const relegationSlots = Number(division.relegation_slots || 0)
  const championshipSlots = Number(division.championship_slots || 0)

  return standings.map((team, index) => {
    const position = index + 1
    const inPromotion = promotionSlots > 0 && position <= promotionSlots
    const inChampionship = championshipSlots > 0 && position <= championshipSlots
    const inRelegation = relegationSlots > 0 && position > standings.length - relegationSlots
    return {
      ...team,
      position,
      zone: inPromotion ? 'promotion' : inRelegation ? 'relegation' : inChampionship ? 'championship' : 'neutral',
    }
  })
}

export function buildPlayerStats(players = [], goals = [], events = [], cards = [], matches = [], sanctions = []) {
  const stats = new Map(
    players.map((player) => [
      player.id,
      {
        ...player,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        doubleYellowCards: 0,
        totalCards: 0,
        mvpAwards: 0,
        cleanSheets: 0,
        playedMatches: 0,
        goalAverage: 0,
        goalHistory: [],
        activeSanctions: [],
        matchHistory: [],
      },
    ]),
  )
  const playedByPlayer = new Map(players.map((player) => [player.id, new Set()]))

  goals.forEach((goal) => {
    const scorer = stats.get(goal.player_id)
    if (scorer && goal.goal_type !== 'own_goal') {
      scorer.goals += 1
      scorer.goalHistory.push(goal)
      playedByPlayer.get(goal.player_id)?.add(goal.match_id)
    }
    const assistant = stats.get(goal.assist_player_id)
    if (assistant) {
      assistant.assists += 1
      playedByPlayer.get(goal.assist_player_id)?.add(goal.match_id)
    }
  })

  events.forEach((event) => {
    if (event.type !== 'assist') return
    const player = stats.get(event.player_id)
    if (!player) return
    player.assists += 1
    playedByPlayer.get(event.player_id)?.add(event.match_id)
  })

  cards.forEach((card) => {
    const player = stats.get(card.player_id)
    if (!player) return
    if (card.type === 'yellow') player.yellowCards += 1
    if (card.type === 'red') player.redCards += 1
    if (card.type === 'double_yellow') {
      player.doubleYellowCards += 1
      player.yellowCards += 2
      player.redCards += 1
    }
    player.totalCards = player.yellowCards + player.redCards
    playedByPlayer.get(card.player_id)?.add(card.match_id)
  })

  matches
    .filter((match) => isCountedMatch(match))
    .forEach((match) => {
      if (match.mvp_player_id) {
        const mvp = stats.get(match.mvp_player_id)
        if (mvp) mvp.mvpAwards += 1
      }
      const homeClean = Number(match.away_score) === 0
      const awayClean = Number(match.home_score) === 0
      players
        .filter((player) => player.team_id === match.home_team_id && isDefensivePosition(player.position) && homeClean)
        .forEach((player) => {
          const row = stats.get(player.id)
          if (row) row.cleanSheets += 1
        })
      players
        .filter((player) => player.team_id === match.away_team_id && isDefensivePosition(player.position) && awayClean)
        .forEach((player) => {
          const row = stats.get(player.id)
          if (row) row.cleanSheets += 1
        })
    })

  sanctions
    .filter((sanction) => sanction.status === 'active' && sanction.player_id)
    .forEach((sanction) => {
      stats.get(sanction.player_id)?.activeSanctions.push(sanction)
    })

  stats.forEach((player) => {
    player.playedMatches = playedByPlayer.get(player.id)?.size ?? 0
    player.goalAverage = player.playedMatches ? player.goals / player.playedMatches : 0
    player.matchHistory = matches
      .filter((match) => playedByPlayer.get(player.id)?.has(match.id) || match.mvp_player_id === player.id)
      .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
  })

  return [...stats.values()]
}

export function buildMvpRanking(players = [], matches = []) {
  const ranking = new Map(players.map((player) => [player.id, { ...player, mvpAwards: 0, mvps: [] }]))
  matches
    .filter((match) => isCountedMatch(match) && match.mvp_player_id)
    .forEach((match) => {
      const player = ranking.get(match.mvp_player_id)
      if (!player) return
      player.mvpAwards += 1
      player.mvps.push(match)
    })
  return [...ranking.values()].filter((player) => player.mvpAwards > 0).sort((a, b) => b.mvpAwards - a.mvpAwards || a.name.localeCompare(b.name))
}

export function isCountedMatch(match) {
  return ['played', 'official'].includes(match?.status)
}

function isDefensivePosition(position = '') {
  const normalized = position.toLowerCase()
  return ['por', 'portero', 'arquero', 'def', 'defensa'].some((value) => normalized.includes(value))
}

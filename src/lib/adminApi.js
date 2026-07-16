import { supabase } from './supabase'
import { uploadPublicFile } from './data'
import { formatNovaId } from './novaId'

export async function saveTeam(form) {
  const payload = {
    name: form.name,
    division_id: form.division_id || null,
    city: form.city,
    founded: form.founded ? Number(form.founded) : null,
    captain: form.captain || null,
    category: form.category || null,
    season: form.season || null,
    crest_url: form.crest_url || null,
  }
  if (form.crestFile) {
    payload.crest_url = await uploadPublicFile('team-crests', `${crypto.randomUUID()}-${form.crestFile.name}`, form.crestFile)
  }
  return supabase.from('teams').upsert(form.id ? { ...payload, id: form.id } : payload).select().single()
}

export async function saveDivision(form) {
  return supabase
    .from('divisions')
    .upsert({
      id: form.id || undefined,
      name: form.name,
      slug: form.slug || form.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: form.description || null,
      active: form.active !== 'false' && form.active !== false,
      level: Number(form.level),
      // Ajusta estos cupos para cambiar cuántos equipos suben/bajan.
      promotion_slots: Number(form.promotion_slots || 0),
      relegation_slots: Number(form.relegation_slots || 0),
      championship_slots: Number(form.championship_slots || 0),
    })
    .select()
    .single()
}

export async function closeSeason({ season, divisionTables }) {
  const ordered = [...divisionTables].sort((a, b) => a.level - b.level)
  const champions = []
  const promoted = []
  const relegated = []
  const finalTables = ordered.map((division) => ({
    division_id: division.id,
    division_name: division.name,
    table: division.standings.map(({ id, name, position, played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference, points }) => ({
      team_id: id,
      team_name: name,
      position,
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
    })),
  }))

  const moves = []
  ordered.forEach((division, index) => {
    const champion = division.standings[0]
    if (champion) champions.push({ team_id: champion.id, team_name: champion.name, division_id: division.id, division_name: division.name })

    const upper = ordered[index - 1]
    const lower = ordered[index + 1]
    const promotionSlots = Number(division.promotion_slots || 0)
    const relegationSlots = Number(division.relegation_slots || 0)

    if (upper && promotionSlots > 0) {
      division.standings.slice(0, promotionSlots).forEach((team) => {
        promoted.push({ team_id: team.id, team_name: team.name, from_division_id: division.id, to_division_id: upper.id, division_name: division.name })
        moves.push({ teamId: team.id, divisionId: upper.id })
      })
    }

    if (lower && relegationSlots > 0) {
      division.standings.slice(-relegationSlots).forEach((team) => {
        relegated.push({ team_id: team.id, team_name: team.name, from_division_id: division.id, to_division_id: lower.id, division_name: division.name })
        moves.push({ teamId: team.id, divisionId: lower.id })
      })
    }
  })

  const history = await supabase.from('season_history').insert({ season, champions, promoted, relegated, final_tables: finalTables })
  if (history.error) return history

  for (const move of moves) {
    const result = await supabase.from('teams').update({ division_id: move.divisionId }).eq('id', move.teamId)
    if (result.error) return result
  }

  await supabase.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('match_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('match_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('playoff_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  return { error: null }
}

export async function saveLeagueSettings(form) {
  const payload = {
    id: 1,
    name: form.name,
    short_name: form.short_name,
    tagline: form.tagline,
    description: form.description,
    logo_url: form.logo_url || null,
  }
  if (form.logoFile) {
    payload.logo_url = await uploadPublicFile('league-assets', `${crypto.randomUUID()}-${form.logoFile.name}`, form.logoFile)
  }
  return supabase.from('league_settings').upsert(payload).select().single()
}

export async function saveChampionSpotlight(form) {
  const existing = await supabase.from('champion_spotlight').select('*').eq('id', 1).maybeSingle()
  if (existing.error) return existing

  const previous = existing.data
  const championChanged = previous?.champion_team_id && (
    previous.champion_team_id !== form.champion_team_id ||
    previous.tournament_name !== form.tournament_name ||
    previous.season_label !== form.season_label
  )

  if (championChanged) {
    const history = await supabase.from('champion_history').insert({
      tournament_name: previous.tournament_name,
      season_label: previous.season_label,
      champion_team_id: previous.champion_team_id,
      champion_photo_url: previous.champion_photo_url,
      message_title: previous.message_title,
      message_body: previous.message_body,
    })
    if (history.error) return history
  }

  const payload = {
    id: 1,
    is_active: Boolean(form.is_active),
    display_mode: form.display_mode || 'home_section',
    tournament_name: form.tournament_name,
    season_label: form.season_label || null,
    champion_team_id: form.champion_team_id || null,
    champion_photo_url: form.champion_photo_url || null,
    message_title: form.message_title || null,
    message_body: form.message_body || null,
  }
  if (form.championPhotoFile) {
    payload.champion_photo_url = await uploadPublicFile('league-assets', `champions/${crypto.randomUUID()}-${form.championPhotoFile.name}`, form.championPhotoFile)
  }
  return supabase.from('champion_spotlight').upsert(payload).select().single()
}

export async function savePlayer(form) {
  if (!form.team_id) return { error: { message: 'Selecciona un equipo para el jugador.' } }
  const payload = {
    team_id: form.team_id,
    nova_id: form.nova_id || formatNovaId(Date.now()),
    status: form.status || 'active',
    name: form.name,
    email: form.email || null,
    phone: form.phone || null,
    birth_date: form.birth_date || null,
    requested_team_name: form.requested_team_name || null,
    position: form.position,
    number: form.number ? Number(form.number) : null,
    age: form.age ? Number(form.age) : null,
    photo_url: form.photo_url || null,
    approval_status: form.approval_status || 'approved',
  }
  if (form.photoFile) {
    payload.photo_url = await uploadPublicFile('player-photos', `${crypto.randomUUID()}-${form.photoFile.name}`, form.photoFile)
  }
  return supabase.from('players').upsert(form.id ? { ...payload, id: form.id } : payload).select().single()
}

export async function approvePlayer(playerId, teamId) {
  if (!teamId) return { error: { message: 'Selecciona un equipo antes de aprobar al jugador.' } }
  return supabase.from('players').update({ approval_status: 'approved', team_id: teamId }).eq('id', playerId)
}

export async function rejectPlayer(playerId) {
  return supabase.from('players').update({ approval_status: 'rejected' }).eq('id', playerId)
}

export async function assignPlayerToTeam(playerId, teamId) {
  if (!teamId) return { error: { message: 'Selecciona un equipo para asignar al jugador.' } }
  return supabase.from('players').update({ team_id: teamId }).eq('id', playerId)
}

export async function saveMatch(form) {
  return supabase
    .from('matches')
    .upsert({
      id: form.id || undefined,
      division_id: form.division_id,
      round: Number(form.round),
      match_date: form.match_date,
      home_team_id: form.home_team_id,
      away_team_id: form.away_team_id,
      home_score: form.home_score === '' ? null : Number(form.home_score),
      away_score: form.away_score === '' ? null : Number(form.away_score),
      venue: form.venue || null,
      status: form.status,
      mvp_player_id: form.mvp_player_id || null,
      observations: form.observations || null,
    })
    .select()
    .single()
}

export async function saveEvent(form) {
  return supabase
    .from('match_events')
    .upsert({
      id: form.id || undefined,
      division_id: form.division_id || null,
      match_id: form.match_id,
      team_id: form.team_id,
      player_id: form.player_id,
      type: form.type,
      minute: Number(form.minute),
    })
    .select()
    .single()
}

export async function saveGoal(form) {
  return supabase
    .from('goals')
    .upsert({
      id: form.id || undefined,
      division_id: form.division_id || null,
      match_id: form.match_id,
      team_id: form.team_id,
      player_id: form.player_id,
      minute: Number(form.minute),
      goal_type: form.goal_type,
      assist_player_id: form.assist_player_id || null,
    })
    .select()
    .single()
}

export async function saveCard(form) {
  return supabase
    .from('match_cards')
    .upsert({
      id: form.id || undefined,
      division_id: form.division_id || null,
      match_id: form.match_id,
      team_id: form.team_id,
      player_id: form.player_id,
      type: form.type,
      minute: Number(form.minute),
      reason: form.reason || null,
    })
    .select()
    .single()
}

export async function deleteRecord(table, id) {
  return supabase.from(table).delete().eq('id', id)
}

function playoffWinner(payload) {
  if (payload.home_score === '' || payload.away_score === '') return null
  const home = Number(payload.home_score)
  const away = Number(payload.away_score)
  if (home > away) return payload.home_team_id
  if (away > home) return payload.away_team_id
  const homePens = payload.home_penalties === '' || payload.home_penalties == null ? null : Number(payload.home_penalties)
  const awayPens = payload.away_penalties === '' || payload.away_penalties == null ? null : Number(payload.away_penalties)
  if (homePens == null || awayPens == null || homePens === awayPens) return null
  return homePens > awayPens ? payload.home_team_id : payload.away_team_id
}

export async function generateSemifinals(standings, divisionId) {
  const top = standings.slice(0, 4)
  if (top.length < 4) return { error: { message: 'Se necesitan al menos 4 equipos en la tabla.' } }

  if (divisionId) await supabase.from('playoff_matches').delete().eq('division_id', divisionId)
  else await supabase.from('playoff_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  return supabase.from('playoff_matches').upsert([
    { division_id: divisionId || null, stage: 'semifinal', slot: 1, home_team_id: top[0].id, away_team_id: top[3].id, home_seed: 1, away_seed: 4, status: 'pending' },
    { division_id: divisionId || null, stage: 'semifinal', slot: 2, home_team_id: top[1].id, away_team_id: top[2].id, home_seed: 2, away_seed: 3, status: 'pending' },
  ], { onConflict: 'division_id,stage,slot' })
}

export async function savePlayoffMatch(form, allPlayoffs = [], includeThirdPlace = false) {
  const winner = playoffWinner(form)
  const payload = {
    id: form.id || undefined,
    division_id: form.division_id || null,
    stage: form.stage,
    slot: Number(form.slot),
    home_team_id: form.home_team_id,
    away_team_id: form.away_team_id,
    home_seed: form.home_seed || null,
    away_seed: form.away_seed || null,
    match_date: form.match_date || null,
    venue: form.venue || null,
    home_score: form.home_score === '' ? null : Number(form.home_score),
    away_score: form.away_score === '' ? null : Number(form.away_score),
    home_penalties: form.home_penalties === '' ? null : Number(form.home_penalties),
    away_penalties: form.away_penalties === '' ? null : Number(form.away_penalties),
    winner_team_id: winner,
    status: form.status,
    mvp_player_id: form.mvp_player_id || null,
  }
  const result = await supabase.from('playoff_matches').upsert(payload, { onConflict: 'division_id,stage,slot' }).select().single()
  if (result.error) return result

  const next = allPlayoffs.map((match) => (match.id === result.data.id ? result.data : match))
  const semis = next.filter((match) => match.stage === 'semifinal')
  if (semis.length >= 2 && semis.every((match) => match.winner_team_id)) {
    const [sf1, sf2] = semis.sort((a, b) => a.slot - b.slot)
    const final = next.find((match) => match.stage === 'final')
    await supabase.from('playoff_matches').upsert({
      id: final?.id,
      division_id: form.division_id || null,
      stage: 'final',
      slot: 1,
      home_team_id: sf1.winner_team_id,
      away_team_id: sf2.winner_team_id,
      status: final?.status || 'pending',
    }, { onConflict: 'division_id,stage,slot' })

    if (includeThirdPlace) {
      const third = next.find((match) => match.stage === 'third_place')
      await supabase.from('playoff_matches').upsert({
        id: third?.id,
        division_id: form.division_id || null,
        stage: 'third_place',
        slot: 1,
        home_team_id: sf1.winner_team_id === sf1.home_team_id ? sf1.away_team_id : sf1.home_team_id,
        away_team_id: sf2.winner_team_id === sf2.home_team_id ? sf2.away_team_id : sf2.home_team_id,
        status: third?.status || 'pending',
      }, { onConflict: 'division_id,stage,slot' })
    }
  }
  return result
}

export async function saveSanction(form) {
  return supabase
    .from('sanctions')
    .upsert({
      id: form.id || undefined,
      division_id: form.division_id || null,
      player_id: form.sanction_target === 'player' ? form.player_id || null : null,
      team_id: form.sanction_target === 'team' ? form.team_id || null : null,
      sanction_type: form.sanction_type,
      reason: form.reason,
      suspended_matches: form.suspended_matches ? Number(form.suspended_matches) : 0,
      start_date: form.start_date,
      status: form.status,
      notes: form.notes || null,
    })
    .select()
    .single()
}

export async function saveNews(form) {
  const payload = {
    title: form.title,
    excerpt: form.excerpt,
    body: form.body,
    cover_url: form.cover_url || null,
    published_at: form.published_at || new Date().toISOString(),
  }
  if (form.coverFile) {
    payload.cover_url = await uploadPublicFile('news-covers', `${crypto.randomUUID()}-${form.coverFile.name}`, form.coverFile)
  }
  return supabase.from('news').upsert(form.id ? { ...payload, id: form.id } : payload).select().single()
}

export async function saveNovaChampionsSettings(form) {
  return supabase.from('nova_champions_settings').upsert({
    id: 1,
    is_active: form.is_active,
    status: form.is_active ? 'active' : 'coming_soon',
    season_id: form.season_id || new Date().getFullYear().toString(),
    format: Number(form.format || 8),
  }).select().single()
}

export async function setNovaChampionsTeam(teamId, selected, seasonId = new Date().getFullYear().toString()) {
  if (selected) {
    return supabase.from('nova_champions_qualified_teams').upsert({
      team_id: teamId,
      season_id: seasonId,
      qualification_method: 'manual',
    }, { onConflict: 'team_id,season_id' })
  }
  return supabase.from('nova_champions_qualified_teams').delete().eq('team_id', teamId).eq('season_id', seasonId)
}

export async function saveNovaChampionsMatch(form) {
  const home = form.home_score === '' || form.home_score == null ? null : Number(form.home_score)
  const away = form.away_score === '' || form.away_score == null ? null : Number(form.away_score)
  const homePen = form.home_penalties === '' || form.home_penalties == null ? null : Number(form.home_penalties)
  const awayPen = form.away_penalties === '' || form.away_penalties == null ? null : Number(form.away_penalties)
  const winner = home == null || away == null
    ? null
    : home > away ? form.home_team_id
      : away > home ? form.away_team_id
        : homePen != null && awayPen != null && homePen !== awayPen ? (homePen > awayPen ? form.home_team_id : form.away_team_id)
          : form.winner_team_id || null

  const result = await supabase.from('nova_champions_matches').upsert({
    id: form.id || undefined,
    season_id: form.season_id || new Date().getFullYear().toString(),
    round: form.round,
    match_order: Number(form.match_order || 1),
    home_team_id: form.home_team_id || null,
    away_team_id: form.away_team_id || null,
    home_score: home,
    away_score: away,
    home_penalties: homePen,
    away_penalties: awayPen,
    winner_team_id: winner,
    status: form.status || 'scheduled',
    match_date: form.match_date || null,
    venue: form.venue || null,
    mvp_player_id: form.mvp_player_id || null,
    best_goalkeeper_player_id: form.best_goalkeeper_player_id || null,
  }).select().single()
  if (result.error) return result

  if (winner) {
    const advance = await advanceNovaChampionsWinner(result.data)
    if (advance.error) return advance
  }

  return result
}

const nextChampionsRound = {
  round_of_32: 'round_of_16',
  round_of_16: 'quarterfinal',
  quarterfinal: 'semifinal',
  semifinal: 'final',
}

async function advanceNovaChampionsWinner(match) {
  const nextRound = nextChampionsRound[match.round]
  if (!nextRound) return { error: null }

  const nextSlot = Math.ceil(Number(match.match_order) / 2)
  const field = Number(match.match_order) % 2 === 1 ? 'home_team_id' : 'away_team_id'
  const existing = await supabase
    .from('nova_champions_matches')
    .select('*')
    .eq('season_id', match.season_id)
    .eq('round', nextRound)
    .eq('match_order', nextSlot)
    .maybeSingle()
  if (existing.error) return existing

  return supabase.from('nova_champions_matches').upsert({
    id: existing.data?.id,
    season_id: match.season_id,
    round: nextRound,
    match_order: nextSlot,
    home_team_id: field === 'home_team_id' ? match.winner_team_id : existing.data?.home_team_id || null,
    away_team_id: field === 'away_team_id' ? match.winner_team_id : existing.data?.away_team_id || null,
    status: existing.data?.status || 'scheduled',
    match_date: existing.data?.match_date || null,
    venue: existing.data?.venue || null,
  }, { onConflict: 'season_id,round,match_order' })
}

export async function generateNovaChampionsBracket({ teams, seasonId, format = 8, mode = 'ranking' }) {
  const size = Number(format)
  if (![8, 16, 32].includes(size)) return { error: { message: 'Selecciona formato de 8, 16 o 32 equipos.' } }
  if (teams.length < size) return { error: { message: `Selecciona al menos ${size} equipos clasificados.` } }

  const selected = mode === 'random'
    ? [...teams].sort(() => Math.random() - 0.5).slice(0, size)
    : [...teams].sort((a, b) => Number(a.seed || 999) - Number(b.seed || 999)).slice(0, size)

  const top = selected.slice(0, size / 2)
  const pot = selected.slice(size / 2)
  const matches = []
  top.forEach((team, index) => {
    let opponentIndex = pot.findIndex((candidate) => candidate.division_id !== team.division_id)
    if (opponentIndex < 0) opponentIndex = 0
    const [opponent] = pot.splice(opponentIndex, 1)
    matches.push({
      season_id: seasonId,
      round: size === 32 ? 'round_of_32' : size === 16 ? 'round_of_16' : 'quarterfinal',
      match_order: index + 1,
      home_team_id: team.id,
      away_team_id: opponent?.id || null,
      status: 'scheduled',
    })
  })

  const clear = await supabase.from('nova_champions_matches').delete().eq('season_id', seasonId)
  if (clear.error) return clear
  return supabase.from('nova_champions_matches').insert(matches)
}

export async function saveNovaChampionsStat(form) {
  return supabase.from('nova_champions_stats').insert({
    match_id: form.match_id,
    player_id: form.player_id,
    team_id: form.team_id,
    stat_type: form.stat_type,
    minute: form.minute ? Number(form.minute) : null,
    value: Number(form.value || 1),
  })
}

export async function savePlayoffSetting({ division_id, is_active }) {
  if (!division_id) return { error: { message: 'Selecciona una división.' } }
  return supabase.from('playoff_settings').upsert({
    division_id,
    is_active,
    status: is_active ? 'active' : 'coming_soon',
  }, { onConflict: 'division_id' }).select().single()
}

export async function saveMatchLineups({ match, presentPlayers, captains }) {
  const rows = presentPlayers.map((player) => ({
    match_id: match.id,
    team_id: player.team_id,
    player_id: player.id,
    is_starter: true,
    is_present: true,
    captain: captains[player.team_id] === player.id,
  }))
  await supabase.from('match_lineups').delete().eq('match_id', match.id)
  if (!rows.length) return { error: { message: 'Selecciona jugadores presentes.' } }
  return supabase.from('match_lineups').insert(rows)
}

export async function saveMatchReport(form) {
  return supabase.from('match_reports').upsert({
    id: form.id || undefined,
    match_id: form.match_id,
    referee_name: form.referee_name || null,
    observations: form.observations || null,
    report_data: form.report_data || null,
    home_captain_signature: form.home_captain_signature || null,
    away_captain_signature: form.away_captain_signature || null,
    referee_signature: form.referee_signature || null,
    pdf_url: form.pdf_url || null,
    status: form.status || 'draft',
  }, { onConflict: 'match_id' }).select().single()
}

export async function saveDigitalMatchEvent(form) {
  const base = {
    division_id: form.division_id || null,
    match_id: form.match_id,
    team_id: form.team_id,
    player_id: form.player_id || null,
    related_player_id: form.related_player_id || null,
    type: form.event_type,
    event_type: form.event_type,
    minute: form.minute ? Number(form.minute) : 0,
    detail: form.detail || null,
  }

  const eventResult = await supabase.from('match_events').insert(base).select().single()
  if (eventResult.error) return eventResult

  if (form.event_type === 'goal') {
    const goalResult = await saveGoal({
      division_id: form.division_id,
      match_id: form.match_id,
      team_id: form.team_id,
      player_id: form.player_id,
      minute: form.minute || 0,
      goal_type: form.goal_type || 'open_play',
      assist_player_id: form.related_player_id || '',
    })
    if (goalResult.error) return goalResult
  }

  if (form.event_type === 'assist') {
    const assistResult = await saveEvent({
      division_id: form.division_id,
      match_id: form.match_id,
      team_id: form.team_id,
      player_id: form.player_id,
      type: 'assist',
      minute: form.minute || 0,
    })
    if (assistResult.error) return assistResult
  }

  if (form.event_type === 'yellow_card' || form.event_type === 'red_card') {
    const cardResult = await saveCard({
      division_id: form.division_id,
      match_id: form.match_id,
      team_id: form.team_id,
      player_id: form.player_id,
      type: form.event_type === 'yellow_card' ? 'yellow' : 'red',
      minute: form.minute || 0,
      reason: form.detail || '',
    })
    if (cardResult.error) return cardResult
  }

  if (form.event_type === 'mvp') {
    const matchResult = await supabase.from('matches').update({ mvp_player_id: form.player_id }).eq('id', form.match_id)
    if (matchResult.error) return matchResult
  }

  return eventResult
}

export async function deleteDigitalMatchEvent(event) {
  const type = event.event_type || event.type
  if (type === 'goal') {
    const goalDelete = await supabase
      .from('goals')
      .delete()
      .eq('match_id', event.match_id)
      .eq('team_id', event.team_id)
      .eq('player_id', event.player_id)
      .eq('minute', Number(event.minute || 0))
    if (goalDelete.error) return goalDelete
  }

  if (type === 'yellow_card' || type === 'red_card') {
    const cardDelete = await supabase
      .from('match_cards')
      .delete()
      .eq('match_id', event.match_id)
      .eq('team_id', event.team_id)
      .eq('player_id', event.player_id)
      .eq('minute', Number(event.minute || 0))
      .eq('type', type === 'yellow_card' ? 'yellow' : 'red')
    if (cardDelete.error) return cardDelete
  }

  return supabase.from('match_events').delete().eq('id', event.id)
}

export async function finalizeDigitalMatch({ match, report, score }) {
  const matchResult = await supabase.from('matches').update({
    home_score: Number(score.home),
    away_score: Number(score.away),
    status: 'played',
    venue: report.venue || match.venue || null,
    observations: report.observations || match.observations || null,
  }).eq('id', match.id)
  if (matchResult.error) return matchResult

  return saveMatchReport({
    ...report,
    match_id: match.id,
    status: 'finalized',
  })
}

export async function confirmNovaIdAttendance({ match, player }) {
  if (!match || !player) return { error: { message: 'Selecciona partido y jugador.' } }
  if (![match.home_team_id, match.away_team_id].includes(player.team_id)) {
    return { error: { message: 'Jugador registrado en otro equipo.' } }
  }

  const roster = await supabase.from('match_roster').upsert({
    match_id: match.id,
    player_id: player.id,
    confirmed: true,
    confirmed_at: new Date().toISOString(),
  }, { onConflict: 'match_id,player_id' })
  if (roster.error) return roster

  return supabase.from('match_lineups').upsert({
    match_id: match.id,
    team_id: player.team_id,
    player_id: player.id,
    is_starter: true,
    is_present: true,
    captain: false,
  }, { onConflict: 'match_id,player_id' })
}

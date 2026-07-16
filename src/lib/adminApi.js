import { supabase } from './supabase'
import { uploadPublicFile } from './data'
import { formatNovaId } from './novaId'

async function currentActor() {
  const { data } = await supabase.auth.getUser()
  return {
    user_id: data.user?.id || null,
    actor_email: data.user?.email || null,
  }
}

async function readRecord(table, id) {
  if (!id) return null
  const result = await supabase.from(table).select('*').eq('id', id).maybeSingle()
  return result.error ? null : result.data
}

async function logAudit({ action, module, entityTable, entityId, previousValue = null, newValue = null, reason = null }) {
  try {
    const actor = await currentActor()
    await supabase.from('audit_logs').insert({
      ...actor,
      action,
      module,
      entity_table: entityTable,
      entity_id: entityId ? String(entityId) : null,
      previous_value: previousValue,
      new_value: newValue,
      reason,
    })
  } catch {
    // La bitacora no debe bloquear la operacion principal si la migracion aun no existe.
  }
}

async function auditResult(result, audit) {
  if (!result.error) {
    await logAudit({
      ...audit,
      entityId: audit.entityId || result.data?.id,
      newValue: audit.newValue ?? result.data ?? null,
    })
  }
  return result
}

export async function saveTeam(form) {
  const previous = await readRecord('teams', form.id)
  const payload = {
    name: form.name,
    division_id: form.division_id || null,
    city: form.city,
    founded: form.founded ? Number(form.founded) : null,
    captain: form.captain || null,
    coach: form.coach || null,
    category: form.category || null,
    season: form.season || null,
    roster_limit: Number(form.roster_limit || 18),
    home_colors: form.home_colors || null,
    away_colors: form.away_colors || null,
    social_url: form.social_url || null,
    inscription_status: form.inscription_status || 'active',
    crest_url: form.crest_url || null,
  }
  if (form.crestFile) {
    payload.crest_url = await uploadPublicFile('team-crests', `${crypto.randomUUID()}-${form.crestFile.name}`, form.crestFile)
  }
  const result = await supabase.from('teams').upsert(form.id ? { ...payload, id: form.id } : payload).select().single()
  return auditResult(result, { action: form.id ? 'update' : 'create', module: 'teams', entityTable: 'teams', previousValue: previous })
}

export async function saveDivision(form) {
  const previous = await readRecord('divisions', form.id)
  const result = await supabase
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
  return auditResult(result, { action: form.id ? 'update' : 'create', module: 'divisions', entityTable: 'divisions', previousValue: previous })
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
  const previous = await readRecord('league_settings', 1)
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
  const result = await supabase.from('league_settings').upsert(payload).select().single()
  return auditResult(result, { action: 'update', module: 'settings', entityTable: 'league_settings', entityId: 1, previousValue: previous })
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
  const result = await supabase.from('champion_spotlight').upsert(payload).select().single()
  return auditResult(result, { action: 'update', module: 'champion_spotlight', entityTable: 'champion_spotlight', entityId: 1, previousValue: previous })
}

export async function savePlayer(form) {
  if (!form.team_id) return { error: { message: 'Selecciona un equipo para el jugador.' } }
  const previous = await readRecord('players', form.id)
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
  const result = await supabase.from('players').upsert(form.id ? { ...payload, id: form.id } : payload).select().single()
  return auditResult(result, { action: form.id ? 'update' : 'create', module: 'players', entityTable: 'players', previousValue: previous })
}

export async function saveRosterMovement(form) {
  const result = await supabase.from('roster_movements').insert({
    player_id: form.player_id,
    from_team_id: form.from_team_id || null,
    to_team_id: form.to_team_id || null,
    movement_type: form.movement_type || 'alta',
    reason: form.reason || null,
    status: form.status || 'approved',
  }).select().single()
  if (result.error) return result

  if (form.to_team_id) {
    const previous = await readRecord('players', form.player_id)
    const update = await supabase.from('players').update({ team_id: form.to_team_id }).eq('id', form.player_id)
    if (update.error) return update
    await logAudit({ action: 'roster_move', module: 'rosters', entityTable: 'players', entityId: form.player_id, previousValue: previous, newValue: { team_id: form.to_team_id, movement: result.data } })
  }

  return auditResult(result, { action: 'create', module: 'rosters', entityTable: 'roster_movements' })
}

export async function saveTeamOfWeekSelection(form) {
  const result = await supabase.from('team_of_week').upsert({
    season_label: form.season_label || new Date().getFullYear().toString(),
    round: Number(form.round || 1),
    slot: form.slot,
    player_id: form.player_id,
    team_id: form.team_id,
    note: form.note || null,
  }, { onConflict: 'season_label,round,slot' }).select().single()
  return auditResult(result, { action: 'update', module: 'team_of_week', entityTable: 'team_of_week' })
}

export async function approvePlayer(playerId, teamId) {
  if (!teamId) return { error: { message: 'Selecciona un equipo antes de aprobar al jugador.' } }
  const previous = await readRecord('players', playerId)
  const result = await supabase.from('players').update({ approval_status: 'approved', team_id: teamId }).eq('id', playerId).select().single()
  return auditResult(result, { action: 'approve', module: 'players', entityTable: 'players', entityId: playerId, previousValue: previous, reason: 'Aprobacion de registro' })
}

export async function rejectPlayer(playerId) {
  const previous = await readRecord('players', playerId)
  const result = await supabase.from('players').update({ approval_status: 'rejected' }).eq('id', playerId).select().single()
  return auditResult(result, { action: 'reject', module: 'players', entityTable: 'players', entityId: playerId, previousValue: previous, reason: 'Rechazo de registro' })
}

export async function assignPlayerToTeam(playerId, teamId) {
  if (!teamId) return { error: { message: 'Selecciona un equipo para asignar al jugador.' } }
  const previous = await readRecord('players', playerId)
  const result = await supabase.from('players').update({ team_id: teamId }).eq('id', playerId).select().single()
  return auditResult(result, { action: 'assign_team', module: 'players', entityTable: 'players', entityId: playerId, previousValue: previous })
}

export async function saveMatch(form) {
  const previous = await readRecord('matches', form.id)
  const result = await supabase
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
  return auditResult(result, { action: form.id ? 'update' : 'create', module: 'matches', entityTable: 'matches', previousValue: previous })
}

export async function saveEvent(form) {
  const previous = await readRecord('match_events', form.id)
  const result = await supabase
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
  return auditResult(result, { action: form.id ? 'update' : 'create', module: 'match_events', entityTable: 'match_events', previousValue: previous })
}

export async function saveGoal(form) {
  const previous = await readRecord('goals', form.id)
  const result = await supabase
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
  return auditResult(result, { action: form.id ? 'update' : 'create', module: 'goals', entityTable: 'goals', previousValue: previous })
}

export async function saveCard(form) {
  const previous = await readRecord('match_cards', form.id)
  const result = await supabase
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
  if (!result.error) await ensureDisciplinarySanction(result.data)
  return auditResult(result, { action: form.id ? 'update' : 'create', module: 'discipline', entityTable: 'match_cards', previousValue: previous })
}

async function ensureDisciplinarySanction(card) {
  if (!card?.player_id) return
  const redCard = card.type === 'red' || card.type === 'double_yellow'
  let sanctionType = redCard ? 'Suspensión por tarjeta roja' : ''
  let reason = redCard ? (card.reason || 'Tarjeta roja') : ''
  let suspendedMatches = redCard ? 1 : 0

  if (!redCard && card.type === 'yellow') {
    const { data } = await supabase
      .from('match_cards')
      .select('id')
      .eq('player_id', card.player_id)
      .eq('type', 'yellow')
    const yellowCount = data?.length || 0
    if (yellowCount > 0 && yellowCount % 3 === 0) {
      sanctionType = 'Suspensión por acumulación de amarillas'
      reason = `${yellowCount} tarjetas amarillas acumuladas`
      suspendedMatches = 1
    }
  }

  if (!sanctionType) return
  const existing = await supabase
    .from('sanctions')
    .select('id')
    .eq('player_id', card.player_id)
    .eq('status', 'active')
    .eq('sanction_type', sanctionType)
    .maybeSingle()
  if (existing.data || existing.error) return

  await supabase.from('sanctions').insert({
    division_id: card.division_id || null,
    player_id: card.player_id,
    team_id: null,
    sanction_type: sanctionType,
    reason,
    suspended_matches: suspendedMatches,
    start_date: new Date().toISOString().slice(0, 10),
    status: 'active',
    notes: 'Generada automáticamente desde disciplina.',
  })
}

export async function deleteRecord(table, id) {
  const previous = await readRecord(table, id)
  const result = await supabase.from(table).delete().eq('id', id)
  if (!result.error) await logAudit({ action: 'delete', module: table, entityTable: table, entityId: id, previousValue: previous })
  return result
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
  const result = await supabase.from('playoff_matches').upsert([
    { division_id: divisionId || null, stage: 'semifinal', slot: 1, home_team_id: top[0].id, away_team_id: top[3].id, home_seed: 1, away_seed: 4, status: 'pending' },
    { division_id: divisionId || null, stage: 'semifinal', slot: 2, home_team_id: top[1].id, away_team_id: top[2].id, home_seed: 2, away_seed: 3, status: 'pending' },
  ], { onConflict: 'division_id,stage,slot' })
  if (!result.error) await logAudit({ action: 'generate_semifinals', module: 'playoffs', entityTable: 'playoff_matches', entityId: divisionId, newValue: { divisionId, teams: top.map((team) => team.id) } })
  return result
}

export async function savePlayoffMatch(form, allPlayoffs = [], includeThirdPlace = false) {
  const previous = await readRecord('playoff_matches', form.id)
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
  await logAudit({ action: form.id ? 'update' : 'create', module: 'playoffs', entityTable: 'playoff_matches', entityId: result.data.id, previousValue: previous, newValue: result.data })

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
  const previous = await readRecord('sanctions', form.id)
  const result = await supabase
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
  return auditResult(result, { action: form.id ? 'update' : 'create', module: 'discipline', entityTable: 'sanctions', previousValue: previous, reason: form.reason || null })
}

export async function saveNews(form) {
  const previous = await readRecord('news', form.id)
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
  const result = await supabase.from('news').upsert(form.id ? { ...payload, id: form.id } : payload).select().single()
  return auditResult(result, { action: form.id ? 'update' : 'create', module: 'media', entityTable: 'news', previousValue: previous })
}

export async function saveNovaChampionsSettings(form) {
  const previous = await readRecord('nova_champions_settings', 1)
  const result = await supabase.from('nova_champions_settings').upsert({
    id: 1,
    is_active: form.is_active,
    status: form.is_active ? 'active' : 'coming_soon',
    season_id: form.season_id || new Date().getFullYear().toString(),
    format: Number(form.format || 8),
  }).select().single()
  return auditResult(result, { action: 'update', module: 'nova_champions', entityTable: 'nova_champions_settings', entityId: 1, previousValue: previous })
}

export async function setNovaChampionsTeam(teamId, selected, seasonId = new Date().getFullYear().toString()) {
  if (selected) {
    const result = await supabase.from('nova_champions_qualified_teams').upsert({
      team_id: teamId,
      season_id: seasonId,
      qualification_method: 'manual',
    }, { onConflict: 'team_id,season_id' })
    if (!result.error) await logAudit({ action: 'qualify_team', module: 'nova_champions', entityTable: 'nova_champions_qualified_teams', entityId: teamId, newValue: { team_id: teamId, season_id: seasonId } })
    return result
  }
  const result = await supabase.from('nova_champions_qualified_teams').delete().eq('team_id', teamId).eq('season_id', seasonId)
  if (!result.error) await logAudit({ action: 'unqualify_team', module: 'nova_champions', entityTable: 'nova_champions_qualified_teams', entityId: teamId, previousValue: { team_id: teamId, season_id: seasonId } })
  return result
}

export async function saveNovaChampionsMatch(form) {
  const previous = await readRecord('nova_champions_matches', form.id)
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
  await logAudit({ action: form.id ? 'update' : 'create', module: 'nova_champions', entityTable: 'nova_champions_matches', entityId: result.data.id, previousValue: previous, newValue: result.data })

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
  const result = await supabase.from('nova_champions_matches').insert(matches)
  if (!result.error) await logAudit({ action: 'generate_bracket', module: 'nova_champions', entityTable: 'nova_champions_matches', entityId: seasonId, newValue: { seasonId, format: size, mode, matches } })
  return result
}

export async function saveNovaChampionsStat(form) {
  const result = await supabase.from('nova_champions_stats').insert({
    match_id: form.match_id,
    player_id: form.player_id,
    team_id: form.team_id,
    stat_type: form.stat_type,
    minute: form.minute ? Number(form.minute) : null,
    value: Number(form.value || 1),
  }).select().single()
  return auditResult(result, { action: 'create', module: 'nova_champions_stats', entityTable: 'nova_champions_stats' })
}

export async function savePlayoffSetting({ division_id, is_active }) {
  if (!division_id) return { error: { message: 'Selecciona una división.' } }
  const previous = await supabase.from('playoff_settings').select('*').eq('division_id', division_id).maybeSingle()
  const result = await supabase.from('playoff_settings').upsert({
    division_id,
    is_active,
    status: is_active ? 'active' : 'coming_soon',
  }, { onConflict: 'division_id' }).select().single()
  return auditResult(result, { action: 'update', module: 'playoffs', entityTable: 'playoff_settings', previousValue: previous.data || null })
}

export async function saveMatchLineups({ match, presentPlayers, captains }) {
  const previous = await supabase.from('match_lineups').select('*').eq('match_id', match.id)
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
  const result = await supabase.from('match_lineups').insert(rows)
  if (!result.error) await logAudit({ action: 'save_lineups', module: 'match_sheet', entityTable: 'match_lineups', entityId: match.id, previousValue: previous.data || [], newValue: rows })
  return result
}

export async function saveMatchReport(form) {
  const previous = await supabase.from('match_reports').select('*').eq('match_id', form.match_id).maybeSingle()
  const result = await supabase.from('match_reports').upsert({
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
  return auditResult(result, { action: form.status === 'finalized' ? 'finalize_report' : 'save_report', module: 'match_sheet', entityTable: 'match_reports', previousValue: previous.data || null })
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
    const previousMatch = await readRecord('matches', form.match_id)
    const matchResult = await supabase.from('matches').update({ mvp_player_id: form.player_id }).eq('id', form.match_id)
    if (matchResult.error) return matchResult
    await logAudit({ action: 'set_mvp', module: 'match_sheet', entityTable: 'matches', entityId: form.match_id, previousValue: previousMatch, newValue: { mvp_player_id: form.player_id } })
  }

  return auditResult(eventResult, { action: 'create_event', module: 'match_sheet', entityTable: 'match_events', entityId: eventResult.data.id, newValue: eventResult.data })
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

  const result = await supabase.from('match_events').delete().eq('id', event.id)
  if (!result.error) await logAudit({ action: 'delete_event', module: 'match_sheet', entityTable: 'match_events', entityId: event.id, previousValue: event })
  return result
}

export async function finalizeDigitalMatch({ match, report, score }) {
  const previous = await readRecord('matches', match.id)
  const matchResult = await supabase.from('matches').update({
    home_score: Number(score.home),
    away_score: Number(score.away),
    status: 'played',
    venue: report.venue || match.venue || null,
    observations: report.observations || match.observations || null,
  }).eq('id', match.id)
  if (matchResult.error) return matchResult
  await logAudit({ action: 'finalize_match', module: 'match_sheet', entityTable: 'matches', entityId: match.id, previousValue: previous, newValue: { ...match, home_score: Number(score.home), away_score: Number(score.away), status: 'played' } })

  return saveMatchReport({
    ...report,
    match_id: match.id,
    status: 'finalized',
  })
}

export async function approveOfficialMatch({ match, report }) {
  if (!match?.id) return { error: { message: 'Selecciona un partido para publicar.' } }
  const previousMatch = await readRecord('matches', match.id)
  const previousReport = report?.id ? await readRecord('match_reports', report.id) : null
  const matchResult = await supabase
    .from('matches')
    .update({ status: 'official' })
    .eq('id', match.id)
    .select()
    .single()
  if (matchResult.error) return matchResult

  if (report?.id) {
    const reportResult = await supabase
      .from('match_reports')
      .update({
        status: 'official',
        report_data: {
          ...(report.report_data || {}),
          officialized_at: new Date().toISOString(),
        },
      })
      .eq('id', report.id)
      .select()
      .single()
    if (reportResult.error) return reportResult
    await logAudit({ action: 'officialize_report', module: 'match_review', entityTable: 'match_reports', entityId: report.id, previousValue: previousReport, newValue: reportResult.data })
  }

  return auditResult(matchResult, { action: 'officialize_match', module: 'match_review', entityTable: 'matches', entityId: match.id, previousValue: previousMatch })
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

  const lineup = await supabase.from('match_lineups').upsert({
    match_id: match.id,
    team_id: player.team_id,
    player_id: player.id,
    is_starter: true,
    is_present: true,
    captain: false,
  }, { onConflict: 'match_id,player_id' })
  if (!lineup.error) await logAudit({ action: 'confirm_attendance', module: 'nova_id', entityTable: 'match_roster', entityId: `${match.id}:${player.id}`, newValue: { match_id: match.id, player_id: player.id, team_id: player.team_id } })
  return lineup
}

export async function fetchAuditLogs({ module = '', search = '', limit = 100 } = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (module) query = query.eq('module', module)
  const result = await query
  if (result.error) return result

  const normalized = search.trim().toLowerCase()
  if (!normalized) return result

  return {
    ...result,
    data: result.data.filter((row) => [
      row.actor_email,
      row.action,
      row.module,
      row.entity_table,
      row.entity_id,
      row.reason,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalized)),
  }
}

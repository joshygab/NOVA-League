import { supabase } from './supabase'
import { uploadPublicFile } from './data'

export async function saveTeam(form) {
  const payload = {
    name: form.name,
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

export async function savePlayer(form) {
  const payload = {
    team_id: form.team_id,
    name: form.name,
    position: form.position,
    number: form.number ? Number(form.number) : null,
    age: form.age ? Number(form.age) : null,
    photo_url: form.photo_url || null,
  }
  if (form.photoFile) {
    payload.photo_url = await uploadPublicFile('player-photos', `${crypto.randomUUID()}-${form.photoFile.name}`, form.photoFile)
  }
  return supabase.from('players').upsert(form.id ? { ...payload, id: form.id } : payload).select().single()
}

export async function saveMatch(form) {
  return supabase
    .from('matches')
    .upsert({
      id: form.id || undefined,
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

export async function generateSemifinals(standings) {
  const top = standings.slice(0, 4)
  if (top.length < 4) return { error: { message: 'Se necesitan al menos 4 equipos en la tabla.' } }

  await supabase.from('playoff_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  return supabase.from('playoff_matches').upsert([
    { stage: 'semifinal', slot: 1, home_team_id: top[0].id, away_team_id: top[3].id, home_seed: 1, away_seed: 4, status: 'pending' },
    { stage: 'semifinal', slot: 2, home_team_id: top[1].id, away_team_id: top[2].id, home_seed: 2, away_seed: 3, status: 'pending' },
  ], { onConflict: 'stage,slot' })
}

export async function savePlayoffMatch(form, allPlayoffs = [], includeThirdPlace = false) {
  const winner = playoffWinner(form)
  const payload = {
    id: form.id || undefined,
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
  const result = await supabase.from('playoff_matches').upsert(payload, { onConflict: 'stage,slot' }).select().single()
  if (result.error) return result

  const next = allPlayoffs.map((match) => (match.id === result.data.id ? result.data : match))
  const semis = next.filter((match) => match.stage === 'semifinal')
  if (semis.length >= 2 && semis.every((match) => match.winner_team_id)) {
    const [sf1, sf2] = semis.sort((a, b) => a.slot - b.slot)
    const final = next.find((match) => match.stage === 'final')
    await supabase.from('playoff_matches').upsert({
      id: final?.id,
      stage: 'final',
      slot: 1,
      home_team_id: sf1.winner_team_id,
      away_team_id: sf2.winner_team_id,
      status: final?.status || 'pending',
    }, { onConflict: 'stage,slot' })

    if (includeThirdPlace) {
      const third = next.find((match) => match.stage === 'third_place')
      await supabase.from('playoff_matches').upsert({
        id: third?.id,
        stage: 'third_place',
        slot: 1,
        home_team_id: sf1.winner_team_id === sf1.home_team_id ? sf1.away_team_id : sf1.home_team_id,
        away_team_id: sf2.winner_team_id === sf2.home_team_id ? sf2.away_team_id : sf2.home_team_id,
        status: third?.status || 'pending',
      }, { onConflict: 'stage,slot' })
    }
  }
  return result
}

export async function saveSanction(form) {
  return supabase
    .from('sanctions')
    .upsert({
      id: form.id || undefined,
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function signatureHtml(title, value) {
  const safeImage = typeof value === 'string' && value.startsWith('data:image/')
    ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(title)}">`
    : '<div class="signature-space"></div>'
  return `<div class="signature">${safeImage}<p>${escapeHtml(title)}</p></div>`
}

function eventLabel(event, league) {
  const minute = event.minute ?? Math.ceil(Number(event.match_second || 0) / 60)
  const player = league.playersById.get(event.player_id)?.name
  const team = league.teamsById.get(event.team_id)?.name
  const types = {
    goal: 'Gol', yellow_card: 'Tarjeta amarilla', second_yellow: 'Segunda amarilla',
    red_card: 'Tarjeta roja', substitution: 'Cambio', injury: 'Lesión',
    observation: 'Observación', mvp: 'MVP',
  }
  return `${minute}' · ${types[event.event_type || event.type] || event.event_type || event.type || 'Incidencia'}${player ? ` · ${player}` : ''}${team ? ` (${team})` : ''}${event.detail ? ` · ${event.detail}` : ''}`
}

export function printRefereeMatchReport({ league, match, report }) {
  const popup = window.open('', '_blank', 'width=960,height=760')
  if (!popup) {
    window.alert('Permite las ventanas emergentes para generar el PDF del acta.')
    return
  }
  popup.opener = null

  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  const division = league.divisionsById.get(match.division_id)
  const data = report.report_data || {}
  const refereeSnapshot = Array.isArray(data.events) ? data.events : null
  const events = (refereeSnapshot || league.events || [])
    .filter((event) => refereeSnapshot || (event.match_id === match.id && !event.is_voided))
    .sort((a, b) => Number(a.match_second || a.minute || 0) - Number(b.match_second || b.minute || 0))
  const eventRows = events.length
    ? events.map((event) => `<li>${escapeHtml(eventLabel(event, league))}</li>`).join('')
    : '<li>Sin incidencias registradas.</li>'
  const matchDate = match.match_date ? new Date(match.match_date).toLocaleString('es-MX') : 'Sin fecha'

  popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Acta ${escapeHtml(data.folio || match.id)}</title>
    <style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;margin:0;font-size:12px}
      header{border-bottom:4px solid #111827;padding-bottom:12px;display:flex;justify-content:space-between;gap:20px}.kicker{font-weight:900;letter-spacing:2px;margin:0}.muted{color:#4b5563}
      h1{font-size:23px;margin:5px 0}h2{font-size:16px;margin:20px 0 8px;border-bottom:1px solid #9ca3af;padding-bottom:5px}.meta{text-align:right;line-height:1.5}
      .score{border:2px solid #111827;margin-top:18px;padding:18px;text-align:center}.score strong{display:block;font-size:28px;margin-top:7px}.score p{margin:7px 0 0}
      ul{margin:0;padding-left:20px}li{margin:6px 0}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:36px}.signature{text-align:center}.signature img,.signature-space{height:70px;max-width:100%;object-fit:contain}.signature p{border-top:1px solid #111827;padding-top:5px;margin:0}
      footer{border-top:1px solid #9ca3af;margin-top:26px;padding-top:8px;font-size:10px}.actions{position:fixed;right:16px;top:16px}@media print{.actions{display:none}}
    </style></head><body>
    <button class="actions" onclick="window.print()">Guardar como PDF</button>
    <header><div><p class="kicker">NOVA LEAGUE · MODO REFEREE</p><h1>Acta oficial del partido</h1><p class="muted">Folio: ${escapeHtml(data.folio || `NOVA-${String(match.id).slice(0, 8)}`)} · Versión ${escapeHtml(data.version || 1)}</p></div>
    <div class="meta">${escapeHtml(division?.name || 'Sin división')}<br>Jornada ${escapeHtml(match.round || '—')}<br>${escapeHtml(matchDate)}<br>${escapeHtml(report.status === 'official' ? 'Resultado oficial' : 'En revisión')}</div></header>
    <section class="score"><span>MARCADOR FINAL</span><strong>${escapeHtml(home?.name || 'Local')} ${escapeHtml(match.home_score ?? data.live_score?.home ?? 0)} - ${escapeHtml(match.away_score ?? data.live_score?.away ?? 0)} ${escapeHtml(away?.name || 'Visitante')}</strong>
    <p>Cancha: ${escapeHtml(match.venue || 'Sin registrar')} · Árbitro: ${escapeHtml(report.referee_name || 'Sin registrar')}</p></section>
    <h2>Incidencias registradas por el árbitro</h2><ul>${eventRows}</ul>
    <h2>MVP</h2><p>${escapeHtml(league.playersById.get(data.mvp_player_id || match.mvp_player_id)?.name || 'Sin seleccionar')}</p>
    <h2>Observaciones arbitrales</h2><p>${escapeHtml(report.observations || 'Sin observaciones.')}</p>
    <div class="signatures">${signatureHtml('Capitán local', report.home_captain_signature)}${signatureHtml('Capitán visitante', report.away_captain_signature)}${signatureHtml('Árbitro', report.referee_signature)}</div>
    <footer>Acta generada desde el resultado enviado en NOVA Referee. Código de verificación: ${escapeHtml(data.verification_code || 'Pendiente')}.</footer>
    <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250))<\/script></body></html>`)
  popup.document.close()
}

import { motion } from 'framer-motion'
import { Download, QrCode, Share2, ShieldCheck } from 'lucide-react'
import Badge from './Badge'
import Crest from './Crest'
import PlayerAvatar from './PlayerAvatar'
import { novaIdPayload, playerNovaId, playerStatus, qrImageUrl, shortPosition } from '../lib/novaId'

export default function NovaIdCard({ player, team, division, stats, index = 0 }) {
  const novaId = playerNovaId(player, index)
  const payload = novaIdPayload(player, index)
  const status = playerStatus(player, stats)

  async function shareCard() {
    const url = `${window.location.origin}/nova-id/${novaId}`
    if (navigator.share) await navigator.share({ title: 'NOVA ID', text: `${player.name} · ${novaId}`, url })
  }

  return (
    <motion.article initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-gold/35 bg-black p-5 shadow-gold">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">NOVA League</p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Official Player ID</p>
          </div>
          <ShieldCheck className="text-gold" />
        </div>
        <div className="mt-5 grid place-items-center">
          <div className="rounded-full border-4 border-gold/40 p-1">
            <PlayerAvatar src={player.photo_url} name={player.name} size="lg" />
          </div>
        </div>
        <div className="mt-5 text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{novaId}</p>
          <h2 className="mt-1 text-3xl font-black uppercase">{player.name}</h2>
          <p className="text-slate-400">#{player.number || '--'} · {shortPosition(player.position)}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Info label="Equipo" value={team?.name || 'N/D'} />
          <Info label="División" value={division?.name || 'N/D'} />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <Crest src={team?.crest_url} name={team?.name} size="sm" />
            <Badge tone={status.tone}>{status.icon} {status.label}</Badge>
          </div>
          <QrCode className="text-gold" />
        </div>
        <div className="mt-5 rounded-xl bg-white p-3">
          <img src={qrImageUrl(payload)} alt={`QR ${novaId}`} className="mx-auto h-48 w-48" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="button-secondary" onClick={shareCard}><Share2 size={16} />Compartir</button>
          <a className="button" href={qrImageUrl(payload, 640)} download={`${novaId}.png`}><Download size={16} />Guardar QR</a>
        </div>
      </div>
    </motion.article>
  )
}

function Info({ label, value }) {
  return <div className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-gold">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>
}

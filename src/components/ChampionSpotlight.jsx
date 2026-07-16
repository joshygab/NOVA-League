import { motion } from 'framer-motion'
import { Crown, Sparkles, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import Crest from './Crest'

export default function ChampionSpotlight({ spotlight, team }) {
  if (!spotlight?.is_active || !team) return null

  return (
    <section className="relative overflow-hidden rounded-lg border border-gold/40 bg-black p-5 shadow-gold sm:p-8">
      <GoldConfetti />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,197,66,.22),transparent_34rem)]" />
      {spotlight.champion_photo_url && (
        <div className="absolute inset-0 opacity-20">
          <img src={spotlight.champion_photo_url} alt={team.name} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="inline-flex items-center gap-2 rounded-lg border border-gold/50 bg-gold/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-gold"
        >
          <Trophy size={16} /> Campeón
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.55 }}
          className="mt-5 max-w-4xl text-4xl font-black uppercase tracking-normal text-white sm:text-6xl md:text-7xl"
        >
          CAMPEÓN
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32, duration: 0.5 }}
          className="mt-3 text-sm font-black uppercase tracking-[0.2em] text-gold sm:text-base"
        >
          {spotlight.tournament_name}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.48, duration: 0.6 }}
          className="relative mt-8"
        >
          <div className="absolute inset-0 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative grid h-44 w-44 place-items-center rounded-full border border-gold/50 bg-black/80 shadow-gold sm:h-56 sm:w-56">
            <Crown className="absolute -top-7 text-gold" size={42} />
            <Crest src={team.crest_url} name={team.name} size="xl" />
          </div>
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68, duration: 0.5 }}
          className="mt-7 max-w-4xl text-4xl font-black uppercase tracking-normal text-white sm:text-6xl"
        >
          {team.name}
        </motion.h3>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.82, duration: 0.5 }}
          className="mt-5 max-w-2xl"
        >
          <p className="text-2xl font-black text-gold">{spotlight.message_title || '¡Felicidades, campeones!'}</p>
          <p className="mt-2 text-base leading-7 text-slate-200">{spotlight.message_body || 'Han conquistado la gloria de NOVA.'}</p>
          <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">{spotlight.season_label}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.96, duration: 0.45 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Link to="/tabla" className="button">Ver tabla general</Link>
          <Link to="/historial" className="button-secondary"><Sparkles size={16} /> Historial de campeones</Link>
        </motion.div>
      </div>
    </section>
  )
}

function GoldConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
      {Array.from({ length: 22 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-1.5 w-1.5 rounded-full bg-gold"
          style={{ left: `${(index * 37) % 100}%`, top: `${(index * 19) % 86}%` }}
          animate={{ y: [0, 18, 0], opacity: [0.25, 0.9, 0.25], rotate: [0, 90, 180] }}
          transition={{ duration: 3.2 + (index % 5) * 0.35, repeat: Infinity, delay: index * 0.08 }}
        />
      ))}
    </div>
  )
}

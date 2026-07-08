import { motion } from 'framer-motion'
import { Crown, Sparkles, Trophy } from 'lucide-react'

export default function PremiumComingSoon({ title, subtitle, body, features = ['Formato premium', 'Cruces oficiales', 'Campeón por definir'] }) {
  return (
    <section className="relative min-h-[68vh] overflow-hidden rounded-lg border border-gold/30 bg-black px-4 py-14 text-center shadow-gold sm:px-6">
      <motion.div className="absolute left-1/2 top-10 h-60 w-60 -translate-x-1/2 rounded-full border border-gold/20 sm:h-72 sm:w-72" animate={{ scale: [1, 1.08, 1], opacity: [0.22, 0.5, 0.22] }} transition={{ duration: 4, repeat: Infinity }} />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-3xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg border border-gold/50 bg-gold/10 text-gold shadow-gold sm:h-24 sm:w-24">
          <Trophy size={48} />
        </div>
        <p className="mt-7 inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-gold">
          <Sparkles size={14} /> Próximamente
        </p>
        <h1 className="mt-6 text-4xl font-black uppercase tracking-normal text-white sm:text-5xl md:text-7xl">{title}</h1>
        <p className="mt-5 text-lg font-semibold text-gold sm:text-xl">{subtitle}</p>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-300">{body}</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature} className="rounded-lg border border-gold/20 bg-white/[0.03] p-4 text-gold">
              <Crown className="mx-auto" />
              <p className="mt-2 text-sm font-black uppercase tracking-[0.14em]">{feature}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

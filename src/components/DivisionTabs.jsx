import { motion } from 'framer-motion'

export default function DivisionTabs({ divisions, activeDivision, onChange }) {
  if (!divisions?.length) return null

  return (
    <div className="mb-5 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-2">
        {divisions.map((division) => {
          const active = activeDivision?.id === division.id
          return (
            <button
              key={division.id}
              onClick={() => onChange(division)}
              className={[
                'relative min-h-11 rounded-lg border px-4 py-2 text-sm font-black transition',
                active ? 'border-electric bg-electric text-white shadow-glow' : 'border-white/10 bg-white/5 text-slate-300 hover:border-gold/60 hover:text-gold',
              ].join(' ')}
            >
              {active && <motion.span layoutId="division-active" className="absolute inset-0 rounded-lg ring-1 ring-white/20" transition={{ duration: 0.18 }} />}
              <span className="relative whitespace-nowrap">{division.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

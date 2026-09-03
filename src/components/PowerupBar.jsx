import { motion } from 'framer-motion'

const ITEMS = [
  {
    id: 'lucky',
    icon: '🍀',
    title: 'Afortunado',
    legend: 'x2 si aciertas · -1 si fallas',
  },
  {
    id: 'discard',
    icon: '❌',
    title: 'Descarte',
    legend: 'Quita 1 opción incorrecta · 0 pts',
  },
  {
    id: 'hint',
    icon: '💡',
    title: 'Pista',
    legend: 'Revela la pista · -0.5 pts',
  },
]

export default function PowerupBar({
  luckyUsed,
  luckyActive,
  luckyDisabled,
  discardUsed,
  discardActive,
  discardDisabled,
  hintUsed,
  hintActive,
  hintDisabled,
  onUse,
}) {
  const stateFor = (id) => {
    if (id === 'lucky') return { used: luckyUsed, active: luckyActive, disabled: luckyDisabled }
    if (id === 'discard') return { used: discardUsed, active: discardActive, disabled: discardDisabled }
    return { used: hintUsed, active: hintActive, disabled: hintDisabled }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-chalk text-center">Comodines · 1 uso en toda la partida</p>
      <div className="grid grid-cols-3 gap-2">
        {ITEMS.map(item => {
          const { used, active, disabled } = stateFor(item.id)
          const locked = disabled || used
          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={!locked ? { scale: 0.95 } : {}}
              onClick={() => !locked && onUse(item.id)}
              disabled={locked}
              className={`rounded-xl border-2 px-1 py-2 text-center transition-all ${
                active
                  ? 'border-yellow-400 bg-yellow-900/50'
                  : locked
                  ? 'border-slate-700 bg-slate-800/40 opacity-40 grayscale cursor-not-allowed'
                  : 'border-slate-500 bg-slate-800/80 hover:border-blue-400'
              }`}
            >
              <div className="text-2xl leading-none">{item.icon}</div>
              <div className="text-[11px] font-bold mt-1 text-white">{item.title}</div>
              <div className="text-[10px] text-gray-300 leading-tight mt-0.5 px-0.5">{item.legend}</div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

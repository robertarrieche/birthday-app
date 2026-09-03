import { AnimatePresence, motion } from 'framer-motion'

export default function ReactionOverlay({ reactions }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {reactions.map(r => {
          const xPct = 10 + ((r.id * 37) % 80)
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: -280, scale: [0.5, 1.4, 1.4, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              style={{ position: 'absolute', left: `${xPct}%`, bottom: '100px' }}
              className="text-5xl select-none drop-shadow-lg"
            >
              {r.emoji}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

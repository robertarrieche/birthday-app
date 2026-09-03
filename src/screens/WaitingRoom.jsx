import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'
import { AVATARS, REACTION_EMOJIS } from '../lib/avatars'
import { supabase } from '../lib/supabase'

export default function WaitingRoom() {
  const { participants, currentUser } = useGameStore()
  const isAdmin = currentUser?.isAdmin
  const guests = participants.filter(p => !p.is_admin)

  const handleStartExam = async () => {
    const questionEndsAt = new Date(Date.now() + 30 * 1000).toISOString()
    await supabase
      .from('game_state')
      .update({ status: 'exam', current_question: 0, question_ends_at: questionEndsAt })
      .eq('id', 1)
  }

  const sendReaction = useGameStore(s => s.sendReaction)

  // Arrange seats: up to 8, in 2 rows
  const rows = [guests.slice(0, 4), guests.slice(4, 8)]

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 relative overflow-hidden">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center pt-4"
      >
        <h1 className="font-party text-5xl text-blue-400 drop-shadow-lg">
          🎂 El Cumple de Robert
        </h1>
        <p className="text-blue-300/60 font-chalk text-lg mt-1">Sala de espera — {guests.length} asistente{guests.length !== 1 ? 's' : ''} presente{guests.length !== 1 ? 's' : ''}</p>
      </motion.div>

      {/* Classroom */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-6 my-4">
        {/* Blackboard */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="blackboard w-full max-w-2xl px-8 py-6 text-center"
        >
          <p className="chalk-text font-chalk text-2xl md:text-3xl leading-relaxed">
            📝 Examen sobre el cumpleañero
          </p>
          <p className="chalk-text font-chalk text-base mt-2 opacity-70">
            Esperando que el profe dé inicio...
          </p>
        </motion.div>

        {/* Seats rows */}
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 md:gap-8 justify-center flex-wrap">
            {row.map((p, i) => (
              <SeatCard key={p.id} participant={p} delay={rowIdx * 0.2 + i * 0.1} isAdmin={isAdmin} />
            ))}
            {/* Empty seats */}
            {Array.from({ length: Math.max(0, 4 - row.length) }).map((_, i) => (
              <EmptySeat key={`empty-${rowIdx}-${i}`} delay={rowIdx * 0.2 + (row.length + i) * 0.1} />
            ))}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 pb-4">
        {/* Reaction buttons (guests) */}
        {!currentUser?.isAdmin && (
          <div className="flex gap-2 flex-wrap justify-center">
            {REACTION_EMOJIS.map(emoji => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.8 }}
                whileHover={{ scale: 1.2 }}
                onClick={() => sendReaction(emoji)}
                className="text-2xl p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        )}

        {/* Admin controls */}
        {currentUser?.isAdmin && (
          <div className="flex gap-3 items-center ml-auto">
            <span className="text-yellow-400 font-chalk text-sm">
              {guests.length === 0 ? '⏳ Esperando invitados...' : `✅ ${guests.length} invitado${guests.length !== 1 ? 's' : ''} listo${guests.length !== 1 ? 's' : ''}`}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartExam}
              disabled={guests.length === 0}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all glow-green"
            >
              🚀 ¡Iniciar Examen!
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}

function SeatCard({ participant, delay, isAdmin }) {
  const avatar = AVATARS.find(a => a.id === participant.avatar)

  const handleKick = async () => {
    if (!window.confirm(`¿Sacar a ${participant.name} de la sala?`)) return
    await supabase.from('participants').delete().eq('id', participant.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      className="seat relative group"
    >
      {/* Kick button — always visible for admin */}
      {isAdmin && (
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleKick}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full text-white text-xs font-bold shadow-lg flex items-center justify-center"
          title={`Sacar a ${participant.name}`}
        >
          ✕
        </motion.button>
      )}

      <div className="relative">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-900/60 border-2 border-blue-500 flex items-center justify-center text-4xl">
          {avatar?.emoji || '👤'}
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900" />
      </div>
      <div className="desk px-3 py-1 mt-2 rounded">
        <p className="text-white font-medium text-xs md:text-sm text-center max-w-[80px] truncate">
          {participant.name}
        </p>
      </div>
    </motion.div>
  )
}

function EmptySeat({ delay }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="seat opacity-30"
    >
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-3xl">
        💺
      </div>
      <div className="desk px-3 py-1 mt-2 rounded">
        <p className="text-gray-500 font-medium text-xs text-center max-w-[80px]">Vacío</p>
      </div>
    </motion.div>
  )
}

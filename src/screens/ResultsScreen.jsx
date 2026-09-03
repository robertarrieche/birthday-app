import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'
import { AVATARS } from '../lib/avatars'
import { supabase } from '../lib/supabase'
import Confetti from '../components/Confetti'

const PHASES = ['suspense', 'podium', 'ranking']

export default function ResultsScreen() {
  const { participants, questions, currentUser, gameState } = useGameStore()
  const [phase, setPhase] = useState('suspense')
  const [showAnswers, setShowAnswers] = useState(gameState?.show_answers || false)
  const [allAnswers, setAllAnswers] = useState([])

  const guests = [...participants]
    .filter(p => !p.is_admin)
    .sort((a, b) => b.score - a.score)

  const allZero = guests.length > 0 && guests.every(p => p.score === 0)

  useEffect(() => {
    if (allZero) {
      // Skip podium, go straight to shame screen
      const t1 = setTimeout(() => setPhase('shame'), 3000)
      const t2 = setTimeout(() => setPhase('ranking'), 8000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    const t1 = setTimeout(() => setPhase('podium'), 4000)
    const t2 = setTimeout(() => setPhase('ranking'), 8000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (showAnswers) {
      supabase.from('answers').select('*').then(({ data }) => setAllAnswers(data || []))
    }
  }, [showAnswers])

  const handleShowAnswers = async () => {
    await supabase.from('game_state').update({ show_answers: true }).eq('id', 1)
    setShowAnswers(true)
  }

  const handleRestart = async () => {
    await supabase.from('game_state').update({ status: 'waiting', current_question: 0, show_answers: false }).eq('id', 1)
    await supabase.from('participants').update({ score: 0, has_answered: false }).neq('id', 'none')
    await supabase.from('answers').delete().neq('id', 0)
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'suspense' && <SuspensePhase key="suspense" />}
        {phase === 'shame' && <ShamePhase key="shame" guests={guests} />}
        {phase === 'podium' && <PodiumPhase key="podium" guests={guests} />}
        {phase === 'ranking' && (
          <RankingPhase
            key="ranking"
            guests={guests}
            questions={questions}
            showAnswers={showAnswers}
            allAnswers={allAnswers}
            isAdmin={currentUser?.isAdmin}
            onShowAnswers={handleShowAnswers}
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>

      {phase === 'ranking' && <Confetti />}
    </div>
  )
}

// ── SUSPENSE PHASE ──────────────────────────────────────────────
function SuspensePhase() {
  const [count, setCount] = useState(3)
  useEffect(() => {
    const interval = setInterval(() => setCount(c => c - 1), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 2 }}
      className="flex-1 flex flex-col items-center justify-center min-h-screen gap-8"
    >
      <motion.h1
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="font-party text-4xl text-blue-300 text-center"
      >
        🎺 ¡Y el ganador es...!
      </motion.h1>

      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={`font-party text-9xl ${count > 1 ? 'text-blue-400' : count === 1 ? 'text-yellow-400' : 'text-green-400'}`}
        >
          {count > 0 ? count : '🎉'}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
            className="w-3 h-3 rounded-full bg-blue-500"
          />
        ))}
      </div>
    </motion.div>
  )
}

// ── SHAME PHASE ─────────────────────────────────────────────────
function ShamePhase({ guests }) {
  const SHAME_MESSAGES = [
    '😱 ¡Cero puntos entre todos!',
    '¿En serio? ¿NADIE sabía nada?',
    '🤦 Robert está decepcionado...',
    'Esto es históricamente malo 💀',
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center min-h-screen gap-8 px-4"
    >
      {/* Shame title — bounces in */}
      <motion.h1
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, delay: 0.2 }}
        className="font-party text-4xl md:text-5xl text-red-400 text-center"
      >
        😤 ¡Qué vergüenza estos resultados!
      </motion.h1>

      {/* Subtitle cycling */}
      <motion.div className="text-center space-y-1">
        {SHAME_MESSAGES.map((msg, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.6 }}
            className="font-chalk text-lg text-gray-300"
          >
            {msg}
          </motion.p>
        ))}
      </motion.div>

      {/* Fallen avatars */}
      <div className="flex gap-6 flex-wrap justify-center mt-4">
        {guests.map((p, i) => {
          const avatar = AVATARS.find(a => a.id === p.avatar)
          return (
            <motion.div
              key={p.id}
              initial={{ y: -60, rotate: 0, opacity: 0 }}
              animate={{ y: 0, rotate: i % 2 === 0 ? -85 : 85, opacity: 1 }}
              transition={{ delay: 1.2 + i * 0.15, type: 'spring', stiffness: 80, damping: 8 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-5xl">{avatar?.emoji || '👤'}</span>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 + i * 0.15 }}
                className="text-xs text-gray-500 font-chalk max-w-16 text-center truncate"
              >
                {p.name}
              </motion.p>
            </motion.div>
          )
        })}
      </div>

      {/* Floor line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="w-full max-w-md h-1 bg-red-900/60 rounded-full"
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="font-chalk text-gray-500 text-sm"
      >
        Mostrando el ranking en un momento...
      </motion.p>
    </motion.div>
  )
}

// ── PODIUM PHASE ─────────────────────────────────────────────────
function PodiumPhase({ guests }) {
  const top3 = guests.slice(0, 3)
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
  const heights = [180, 240, 140]
  const medals = ['🥈', '🥇', '🥉']
  const colors = ['bg-slate-500', 'bg-yellow-600', 'bg-orange-700']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center min-h-screen gap-8"
    >
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="font-party text-4xl text-yellow-400 text-center"
      >
        🏆 Top 3 del Examen
      </motion.h1>

      <div className="flex items-end gap-4 justify-center">
        {podiumOrder.map((p, i) => {
          const avatar = AVATARS.find(a => a.id === p.avatar)
          const height = heights[i]
          return (
            <motion.div
              key={p.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.3, type: 'spring', stiffness: 150 }}
              className="flex flex-col items-center gap-2"
            >
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl"
              >
                {medals[i]}
              </motion.div>
              <div className="text-4xl">{avatar?.emoji}</div>
              <p className="font-bold text-sm text-center max-w-20 truncate">{p.name}</p>
              <p className="text-blue-300 font-chalk text-sm">{p.score} pts</p>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height }}
                transition={{ delay: i * 0.3 + 0.5, duration: 0.8, ease: 'easeOut' }}
                className={`w-20 md:w-28 ${colors[i]} rounded-t-lg flex items-start justify-center pt-2 font-party text-white text-2xl`}
              >
                {i === 1 ? '1' : i === 0 ? '2' : '3'}
              </motion.div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ── RANKING PHASE ───────────────────────────────────────────────
function RankingPhase({ guests, questions, showAnswers, allAnswers, isAdmin, onShowAnswers, onRestart }) {
  const allZero = guests.every(p => p.score === 0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-4 py-4"
    >
      <h1 className={`font-party text-4xl text-center ${guests.every(p => p.score === 0) ? 'text-red-400' : 'text-blue-400'}`}>
        {guests.every(p => p.score === 0) ? '💀 Ranking del Desastre' : '🏆 Ranking Final'}
      </h1>

      <div className="space-y-3">
        {guests.map((p, idx) => {
          const avatar = AVATARS.find(a => a.id === p.avatar)
          const isFirst = idx === 0
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, type: 'spring' }}
              className={`flex items-center gap-4 rounded-2xl border-2 transition-all ${
                isFirst && !allZero
                  ? 'bg-yellow-900/40 border-yellow-500 p-5 glow-green'
                  : allZero
                  ? 'bg-red-900/20 border-red-900 p-3'
                  : 'bg-slate-800/60 border-slate-700 p-3'
              }`}
            >
              {/* Position */}
              <div className={`font-party text-center w-10 ${isFirst && !allZero ? 'text-3xl text-yellow-400' : 'text-xl text-gray-500'}`}>
                {allZero ? '💀' : idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </div>
              {/* Avatar — fallen if all zero */}
              <div className={`${isFirst && !allZero ? 'text-4xl' : 'text-3xl'} ${allZero ? 'rotate-90' : ''} transition-transform`}>
                {avatar?.emoji}
              </div>
              {/* Name */}
              <div className="flex-1">
                <p className={`font-bold ${isFirst && !allZero ? 'text-xl text-yellow-200' : 'text-base text-white'}`}>
                  {p.name}
                </p>
              </div>
              {/* Score */}
              <div className={`font-party text-right ${isFirst ? 'text-2xl text-yellow-400' : 'text-lg text-blue-300'}`}>
                {p.score} <span className="text-sm font-sans font-normal text-gray-400">pts</span>
              </div>
            </motion.div>
          )
        })}

        {/* Last place funny message */}
        {guests.length > 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: guests.length * 0.1 + 0.5 }}
            className="text-center text-gray-500 font-chalk text-sm"
          >
            🏅 {guests[guests.length - 1]?.name}: Premio a la lealtad incondicional 😂
          </motion.p>
        )}
      </div>

      {/* Answers section */}
      {showAnswers && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 mt-6"
        >
          <h2 className="font-party text-2xl text-green-400 text-center">✅ Respuestas Correctas</h2>
          {questions.map((q, i) => {
            const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]')
            const correct = Array.isArray(q.correct_answer) ? q.correct_answer : 
              (q.correct_answer?.startsWith('[') ? JSON.parse(q.correct_answer) : [q.correct_answer])
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="blackboard rounded-xl p-4 space-y-2"
              >
                <p className="chalk-text font-chalk font-bold">{i + 1}. {q.text}</p>
                <div className="space-y-1">
                  {opts.map((opt, j) => (
                    <div key={j} className={`px-3 py-1 rounded-lg text-sm font-chalk ${
                      correct.includes(opt) ? 'bg-green-900/60 text-green-300 border border-green-700' : 'text-gray-500'
                    }`}>
                      {correct.includes(opt) && '✅ '}{opt}
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Admin buttons */}
      {isAdmin && (
        <div className="flex flex-col gap-3 pt-4">
          {!showAnswers && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onShowAnswers}
              className="w-full py-3 bg-green-700 hover:bg-green-600 rounded-xl font-bold transition-all"
            >
              📖 Mostrar Respuestas Correctas
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onRestart}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all text-gray-300"
          >
            🔄 Reiniciar para nueva partida
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'
import { supabase } from '../lib/supabase'
import { AVATARS, REACTION_EMOJIS } from '../lib/avatars'
import CountdownTimer from '../components/CountdownTimer'
import QuestionCard from '../components/QuestionCard'

const QUESTION_TIME = 30

export default function ExamScreen() {
  const { currentUser, gameState, questions, participants } = useGameStore()
  const sendReaction = useGameStore(s => s.sendReaction)

  const qIndex = gameState?.current_question ?? 0
  const question = questions[qIndex]
  const totalQ = questions.length

  const [answered, setAnswered] = useState(false)
  const [timeKey, setTimeKey] = useState(0)
  const questionEndsAt = gameState?.question_ends_at

  // Reset answered state when question changes
  useEffect(() => {
    setAnswered(false)
    setTimeKey(k => k + 1)
  }, [qIndex])

  const handleAnswer = useCallback(async (answer) => {
    if (answered || !currentUser || currentUser.isAdmin) return
    const isEmptyAnswer =
      answer == null ||
      (typeof answer === 'string' && !answer.trim()) ||
      (Array.isArray(answer) && answer.length === 0)
    if (isEmptyAnswer) return
    setAnswered(true)
    await supabase.from('answers').upsert({
      participant_id: currentUser.id,
      question_id: question.id,
      answer: JSON.stringify(answer),
    })
    await supabase.from('participants').update({ has_answered: true }).eq('id', currentUser.id)
  }, [answered, currentUser, question])

  const handleNextQuestion = async () => {
    const nextIdx = qIndex + 1
    const nextEndsAt = new Date(Date.now() + QUESTION_TIME * 1000).toISOString()
    // Reset all has_answered
    await supabase.from('participants').update({ has_answered: false }).neq('id', 'none')
    if (nextIdx >= totalQ) {
      // Calculate scores and finish
      await calculateScores()
      await supabase.from('game_state').update({ status: 'finished', current_question: qIndex }).eq('id', 1)
    } else {
      await supabase
        .from('game_state')
        .update({ current_question: nextIdx, question_ends_at: nextEndsAt })
        .eq('id', 1)
    }
  }

  const calculateScores = async () => {
    const { data: allAnswers } = await supabase.from('answers').select('*')
    const { data: allQuestions } = await supabase.from('questions').select('*')
    const { data: parts } = await supabase.from('participants').select('*').eq('is_admin', false)

    const scores = {}
    parts.forEach(p => { scores[p.id] = 0 })

    allAnswers?.forEach(ans => {
      const q = allQuestions?.find(q => q.id === ans.question_id)
      if (!q) return

      // Normalize: always parse strings to their real value
      const parse = (v) => {
        if (Array.isArray(v)) return v
        if (typeof v === 'string') {
          try { return JSON.parse(v) } catch { return v }
        }
        return v
      }

      const given = parse(ans.answer)
      const correct = parse(q.correct_answer)
      let points = 0
      const normalize = (v) => String(v ?? '').trim()

      if (q.type === 'single') {
        // given is a string like "Opción A", correct is ["Opción A"]
        const correctVal = Array.isArray(correct) ? correct[0] : correct
        const givenVal = Array.isArray(given) ? given[0] : given
        if (normalize(givenVal) === normalize(correctVal)) points = 1

      } else if (q.type === 'multiple') {
        const correctArr = (Array.isArray(correct) ? correct : [correct]).map(normalize)
        const givenArr = (Array.isArray(given) ? given : [given]).map(normalize)
        const hits = givenArr.filter(g => correctArr.includes(g)).length
        points = correctArr.length > 0 ? hits / correctArr.length : 0

      } else if (q.type === 'order') {
        const correctArr = (Array.isArray(correct) ? correct : [correct]).map(normalize)
        const givenArr = (Array.isArray(given) ? given : [given]).map(normalize)
        const correctCount = correctArr.filter((item, idx) => givenArr[idx] === item).length
        points = correctArr.length > 0 ? correctCount / correctArr.length : 0
      }

      if (scores[ans.participant_id] !== undefined) {
        const multiplier = q.is_bomb ? 2 : 1
        scores[ans.participant_id] += points * multiplier
      }
    })

    // Update scores
    await Promise.all(
      Object.entries(scores).map(([id, score]) =>
        supabase.from('participants').update({ score: Math.round(score * 100) / 100 }).eq('id', id)
      )
    )
  }

  const guests = participants.filter(p => !p.is_admin)
  const answeredCount = guests.filter(p => p.has_answered).length
  const isBomb = !!question?.is_bomb

  if (!question) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 font-chalk text-xl">⏳ Cargando preguntas...</p>
    </div>
  )

  return (
    <div className={`min-h-screen flex flex-col p-4 relative overflow-hidden transition-colors duration-500 ${
      isBomb ? 'alarm-screen' : ''
    }`}>
      {isBomb && (
        <>
          <div className="pointer-events-none absolute inset-0 alarm-vignette z-0" />
          <motion.div
            initial={{ scale: 0.4, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative z-10 flex flex-col items-center mb-3"
          >
            <motion.span
              animate={{ rotate: [-12, 12, -8, 8, 0], scale: [1, 1.18, 1, 1.12, 1] }}
              transition={{ duration: 0.55, repeat: Infinity }}
              className="text-6xl drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]"
            >
              💣
            </motion.span>
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              className="mt-2 px-5 py-1.5 rounded-full bg-red-600 border-2 border-yellow-300 font-party text-2xl tracking-wider shadow-[0_0_24px_rgba(239,68,68,0.7)]"
            >
              ⚠️ VALE x2 ⚠️
            </motion.div>
            <p className="font-chalk text-red-200 mt-1 text-sm">¡Pregunta bomba! Doble puntaje</p>
          </motion.div>
        </>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <h1 className={`font-party text-2xl ${isBomb ? 'text-red-300' : 'text-blue-400'}`}>🎂 El Cumple de Robert</h1>
          <p className="text-gray-400 text-sm font-chalk">
            Pregunta {qIndex + 1} de {totalQ}
          </p>
        </div>
        <CountdownTimer
          key={timeKey}
          seconds={QUESTION_TIME}
          endAt={questionEndsAt}
          onExpire={() => currentUser?.isAdmin && handleNextQuestion()}
        />
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-700 rounded-full mb-4 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isBomb ? 'bg-red-500' : 'bg-blue-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${((qIndex + 1) / totalQ) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Question (big) */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <QuestionCard
                question={question}
                onAnswer={handleAnswer}
                answered={answered}
                isAdmin={currentUser?.isAdmin}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar: participants status */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-4">
          <h3 className="font-bold text-blue-300 mb-3 text-center font-chalk text-lg">
            👥 {answeredCount}/{guests.length} respondieron
          </h3>
          <div className="space-y-2">
            {guests.map(p => {
              const avatar = AVATARS.find(a => a.id === p.avatar)
              return (
                <motion.div
                  key={p.id}
                  layout
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    p.has_answered ? 'bg-green-900/40 border border-green-700' : 'bg-slate-700/50'
                  }`}
                >
                  <span className="text-xl">{avatar?.emoji || '👤'}</span>
                  <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                  {p.has_answered ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-400 font-bold text-lg"
                    >✓</motion.span>
                  ) : (
                    <span className="text-yellow-500 text-xs font-chalk">⏳ esperando</span>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Admin: next question button */}
          {currentUser?.isAdmin && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleNextQuestion}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all"
            >
              {qIndex + 1 >= totalQ ? '🏁 Finalizar Examen' : '➡️ Siguiente Pregunta'}
            </motion.button>
          )}
        </div>
      </div>

      {/* Reaction bar (guests) */}
      {!currentUser?.isAdmin && (
        <div className="flex gap-2 justify-center mt-4 flex-wrap">
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

      {/* Answered banner (guest) */}
      <AnimatePresence>
        {answered && !currentUser?.isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <div className="bg-green-800/90 border border-green-500 backdrop-blur rounded-xl px-6 py-3 shadow-xl">
              <p className="text-green-300 font-chalk font-bold text-lg tracking-wide">
                ✓ Respuesta enviada — ¡espera al siguiente!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

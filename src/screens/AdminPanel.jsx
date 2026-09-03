import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/useGameStore'

const EMPTY_QUESTION = { text: '', type: 'single', hint: '', is_bomb: false, options: ['', ''], correct_answer: [] }

export default function AdminPanel({ onClose }) {
  const questions = useGameStore(s => s.questions)
  const setQuestions = useGameStore(s => s.setQuestions)
  const [editList, setEditList] = useState(() =>
    questions.length > 0
      ? questions.map(q => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
          hint: q.hint || '',
          is_bomb: !!q.is_bomb,
          correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer :
            (typeof q.correct_answer === 'string' && q.correct_answer.startsWith('[')
              ? JSON.parse(q.correct_answer) : [q.correct_answer]),
        }))
      : [{ ...EMPTY_QUESTION }]
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const updateQ = (idx, field, value) => {
    setEditList(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }

  const addQuestion = () => {
    if (editList.length >= 20) return
    setEditList(prev => [...prev, { ...EMPTY_QUESTION }])
  }

  const removeQuestion = (idx) => {
    setEditList(prev => prev.filter((_, i) => i !== idx))
  }

  const addOption = (qIdx) => {
    setEditList(prev => prev.map((q, i) =>
      i === qIdx ? { ...q, options: [...q.options, ''] } : q
    ))
  }

  const updateOption = (qIdx, optIdx, value) => {
    setEditList(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const opts = [...q.options]
      opts[optIdx] = value
      return { ...q, options: opts }
    }))
  }

  const removeOption = (qIdx, optIdx) => {
    setEditList(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const opts = q.options.filter((_, j) => j !== optIdx)
      const correct = q.correct_answer.filter(c => c !== q.options[optIdx])
      return { ...q, options: opts, correct_answer: correct }
    }))
  }

  const toggleBomb = (qIdx) => {
    setEditList(prev => prev.map((q, i) => ({
      ...q,
      is_bomb: i === qIdx ? !q.is_bomb : false,
    })))
  }

  const toggleCorrect = (qIdx, opt) => {
    setEditList(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      if (q.type === 'single') return { ...q, correct_answer: [opt] }
      const ca = q.correct_answer.includes(opt)
        ? q.correct_answer.filter(c => c !== opt)
        : [...q.correct_answer, opt]
      return { ...q, correct_answer: ca }
    }))
  }

  const handleClearExam = async () => {
    if (!window.confirm('¿Seguro? Esto borrará todas las preguntas, respuestas y puntajes.')) return
    await supabase.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('participants').update({ score: 0, has_answered: false }).neq('id', 'none')
    await supabase.from('game_state').update({ status: 'waiting', current_question: 0, show_answers: false }).eq('id', 1)
    setEditList([{ ...EMPTY_QUESTION }])
    setQuestions([])
  }

  const handleSave = async () => {
    setSaving(true)
    // Delete ALL existing questions first, then insert fresh
    await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const rows = editList
      .filter(q => q.text.trim() && q.options.filter(o => o.trim()).length >= 2)
      .map((q, i) => {
        const cleanOpts = q.options.filter(o => o.trim())
        // For 'order' type: correct_answer IS the options in the order the admin wrote them
        // For others: correct_answer is the marked options
        const correctAnswer = q.type === 'order' ? cleanOpts : q.correct_answer
        return {
          text: q.text.trim(),
          type: q.type,
          hint: (q.hint || '').trim() || null,
          is_bomb: !!q.is_bomb,
          options: JSON.stringify(cleanOpts),
          correct_answer: JSON.stringify(correctAnswer),
          order_index: i,
        }
      })
    const { data, error } = await supabase.from('questions').insert(rows).select()
    if (error) {
      alert(error.message.includes('hint')
        ? 'Falta la columna "hint" en Supabase. Ejecuta: ALTER TABLE questions ADD COLUMN IF NOT EXISTS hint text;'
        : error.message.includes('is_bomb')
        ? 'Falta la columna "is_bomb" en Supabase. Ejecuta: ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_bomb boolean default false;'
        : `Error al guardar: ${error.message}`)
    } else if (data) {
      setQuestions(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 overflow-y-auto p-4"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-900 py-3 z-10">
          <h2 className="font-party text-3xl text-yellow-400">⚙️ Configurar Examen</h2>
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-bold transition-all"
            >
              {saved ? '✅ Guardado!' : saving ? '⏳...' : '💾 Guardar'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleClearExam}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded-xl font-bold transition-all text-red-200"
              title="Borra preguntas, respuestas y reinicia puntajes"
            >
              🗑 Borrar examen
            </motion.button>
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all">
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <AnimatePresence>
            {editList.map((q, qIdx) => (
              <motion.div
                key={qIdx}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`bg-slate-800 border rounded-2xl p-5 space-y-4 ${
                  q.is_bomb ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]' : 'border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-bold text-blue-300 text-lg">Pregunta {qIdx + 1}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBomb(qIdx)}
                      className={`text-sm px-3 py-1 rounded-lg font-bold transition-colors ${
                        q.is_bomb
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-700 text-gray-400 hover:bg-red-900/50 hover:text-red-300'
                      }`}
                    >
                      {q.is_bomb ? '💣 Bomba x2' : '💣 Marcar bomba'}
                    </button>
                    <button
                      onClick={() => removeQuestion(qIdx)}
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-900/30 transition-colors"
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                </div>

                {/* Question text */}
                <textarea
                  value={q.text}
                  onChange={e => updateQ(qIdx, 'text', e.target.value)}
                  placeholder="¿Cuál es la pregunta?"
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Pista (opcional)</label>
                  <input
                    type="text"
                    value={q.hint || ''}
                    onChange={e => updateQ(qIdx, 'hint', e.target.value)}
                    placeholder="Ej. Piensa en 2019… (el invitado solo la ve si pulsa 💡)"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm"
                  />
                </div>

                {/* Type selector */}
                <div className="flex gap-2">
                  {['single', 'multiple', 'order'].map(type => (
                    <button
                      key={type}
                      onClick={() => updateQ(qIdx, 'type', type)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        q.type === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                      }`}
                    >
                      {type === 'single' ? '🔵 Única' : type === 'multiple' ? '🟣 Múltiple' : '🟠 Ordenar'}
                    </button>
                  ))}
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">
                    {q.type === 'order'
                      ? 'Escribe los items en el orden correcto:'
                      : 'Opciones (marca la(s) correcta(s) ✓):'}
                  </p>
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      {q.type !== 'order' && (
                        <button
                          onClick={() => toggleCorrect(qIdx, opt)}
                          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all flex-shrink-0 ${
                            q.correct_answer.includes(opt)
                              ? 'bg-green-600 border-green-500 text-white'
                              : 'border-slate-500 text-gray-500 hover:border-green-600'
                          }`}
                        >
                          {q.correct_answer.includes(opt) ? '✓' : ''}
                        </button>
                      )}
                      {q.type === 'order' && (
                        <span className="w-8 text-center text-orange-400 font-bold flex-shrink-0">{optIdx + 1}.</span>
                      )}
                      <input
                        value={opt}
                        onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                        placeholder={`Opción ${optIdx + 1}`}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                      />
                      {q.options.length > 2 && (
                        <button
                          onClick={() => removeOption(qIdx, optIdx)}
                          className="text-red-400 hover:text-red-300 flex-shrink-0"
                        >✕</button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addOption(qIdx)}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    + Agregar opción
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {editList.length < 20 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={addQuestion}
              className="w-full py-4 border-2 border-dashed border-blue-700 hover:border-blue-500 rounded-2xl text-blue-400 hover:text-blue-300 font-bold transition-all"
            >
              + Agregar pregunta ({editList.length}/20)
            </motion.button>
          )}
        </div>

        <div className="h-20" /> {/* bottom padding */}
      </div>
    </motion.div>
  )
}

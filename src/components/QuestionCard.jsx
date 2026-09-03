import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PowerupBar from './PowerupBar'
import { parsePowerups, questionCorrectList } from '../lib/score'

export default function QuestionCard({ question, onAnswer, answered, isAdmin, powerups, onUsePowerup }) {
  const [selected, setSelected] = useState([])
  const parsedPowerups = parsePowerups(powerups)
  const hint = (question.hint || '').trim()
  const hintOpen = String(parsedPowerups.hintQid) === String(question.id)
  const luckyActive = String(parsedPowerups.luckyQid) === String(question.id)
  const discardActive = String(parsedPowerups.discardQid) === String(question.id)
  const discardedOption = discardActive ? parsedPowerups.discardOption : null
  const [orderItems, setOrderItems] = useState(() => {
    if (question.type === 'order') {
      // Always shuffle — correct order is stored in correct_answer, not options
      const opts = Array.isArray(question.options) ? question.options : JSON.parse(question.options || '[]')
      const shuffled = [...opts]
      // Fisher-Yates shuffle — guaranteed random even if opts are already sorted
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }
    return []
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const options = Array.isArray(question.options) ? question.options : JSON.parse(question.options || '[]')
  const visibleOptions = discardedOption ? options.filter(opt => opt !== discardedOption) : options

  useEffect(() => {
    if (!discardedOption) return
    setSelected(prev => prev.filter(opt => opt !== discardedOption))
  }, [discardedOption])

  const toggleSingle = (opt) => {
    if (answered || isAdmin) return
    setSelected([opt])
  }

  const toggleMultiple = (opt) => {
    if (answered || isAdmin) return
    setSelected(prev =>
      prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
    )
  }

  const handleSubmit = () => {
    if (answered || isAdmin) return
    let answer
    if (question.type === 'order') {
      answer = orderItems
    } else if (question.type === 'single') {
      answer = selected[0] ?? null   // string, not array
    } else {
      answer = selected              // array for multiple
    }
    onAnswer(answer)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setOrderItems(items => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className={`blackboard p-6 rounded-2xl h-full flex flex-col gap-4 ${answered ? 'opacity-75' : ''} ${
      question.is_bomb ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.35)]' : ''
    }`}>
      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
          question.type === 'single' ? 'bg-blue-900 text-blue-300' :
          question.type === 'multiple' ? 'bg-purple-900 text-purple-300' :
          'bg-orange-900 text-orange-300'
        }`}>
          {question.type === 'single' ? '🔵 Opción única' :
           question.type === 'multiple' ? '🟣 Múltiple' :
           '🟠 Ordenar'}
        </span>
        {question.is_bomb && (
          <span className="text-xs font-party tracking-wide px-2 py-1 rounded-full bg-red-600 text-yellow-200 border border-yellow-300 animate-pulse">
            💣 VALE x2
          </span>
        )}
        {luckyActive && (
          <span className="text-xs font-party tracking-wide px-2 py-1 rounded-full bg-green-800 text-green-200 border border-green-500">
            🍀 x2 / -1
          </span>
        )}
      </div>

      {/* Question text */}
      <h2 className="chalk-text font-chalk text-xl md:text-2xl leading-relaxed">
        {question.text}
      </h2>

      <AnimatePresence>
        {!isAdmin && hint && hintOpen && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="chalk-text font-chalk text-base text-yellow-200/90 bg-yellow-950/40 border border-yellow-700/50 rounded-xl px-4 py-2"
          >
            💡 {hint}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="flex-1 space-y-3">
        {question.type === 'single' && visibleOptions.map((opt, i) => (
          <motion.button
            key={i}
            whileTap={!answered && !isAdmin ? { scale: 0.97 } : {}}
            onClick={() => toggleSingle(opt)}
            disabled={answered || isAdmin}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 font-chalk text-base transition-all duration-200 ${
              selected.includes(opt)
                ? 'border-blue-400 bg-blue-900/60 text-white'
                : 'border-slate-600 bg-slate-800/60 text-gray-300 hover:border-blue-600'
            } disabled:cursor-default`}
          >
            <span className="text-blue-400 font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </motion.button>
        ))}

        {question.type === 'multiple' && visibleOptions.map((opt, i) => (
          <motion.button
            key={i}
            whileTap={!answered && !isAdmin ? { scale: 0.97 } : {}}
            onClick={() => toggleMultiple(opt)}
            disabled={answered || isAdmin}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 font-chalk text-base transition-all duration-200 ${
              selected.includes(opt)
                ? 'border-purple-400 bg-purple-900/60 text-white'
                : 'border-slate-600 bg-slate-800/60 text-gray-300 hover:border-purple-600'
            } disabled:cursor-default`}
          >
            <span className={`inline-block w-5 h-5 mr-2 rounded border-2 align-middle text-center text-xs leading-4 ${
              selected.includes(opt) ? 'bg-purple-500 border-purple-400' : 'border-gray-500'
            }`}>
              {selected.includes(opt) ? '✓' : ''}
            </span>
            {opt}
          </motion.button>
        ))}

        {question.type === 'order' && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderItems} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderItems.map((item, idx) => (
                  <SortableItem key={item} id={item} index={idx} disabled={answered || isAdmin} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Submit button (guests only) */}
      {!isAdmin && (
        <>
          <PowerupBar
            luckyUsed={!!parsedPowerups.luckyQid}
            luckyActive={luckyActive}
            luckyDisabled={answered || !!parsedPowerups.luckyQid}
            discardUsed={!!parsedPowerups.discardQid}
            discardActive={discardActive}
            discardDisabled={
              answered ||
              !!parsedPowerups.discardQid ||
              question.type === 'order' ||
              questionCorrectList(question).length >= options.length
            }
            hintUsed={!!parsedPowerups.hintQid}
            hintActive={hintOpen}
            hintDisabled={answered || !!parsedPowerups.hintQid || !hint}
            onUse={onUsePowerup}
          />
          <motion.button
          whileTap={!answered ? { scale: 0.95 } : {}}
          onClick={handleSubmit}
          disabled={answered || (question.type !== 'order' && selected.length === 0)}
          className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
            answered
              ? 'bg-green-700 text-green-200 cursor-default'
              : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {answered ? '✅ Respuesta enviada' : '📨 Enviar respuesta'}
        </motion.button>
        </>
      )}
    </div>
  )
}

function SortableItem({ id, index, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-chalk text-base cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? 'border-orange-400 bg-orange-900/60 shadow-2xl z-10'
          : 'border-slate-600 bg-slate-800/60 text-gray-300'
      } ${disabled ? 'cursor-default' : ''}`}
    >
      <span className="text-orange-400 font-bold w-6">{index + 1}.</span>
      <span className="flex-1">{id}</span>
      {!disabled && <span className="text-gray-500">⠿</span>}
    </motion.div>
  )
}

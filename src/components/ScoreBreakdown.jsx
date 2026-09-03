import { motion } from 'framer-motion'
import { buildScoreBreakdown, isBombQuestion } from '../lib/score'
import AvatarFace from './AvatarFace'

function formatPts(value) {
  if (value == null) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export default function ScoreBreakdown({ guests, questions, answers }) {
  const sortedQuestions = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  const rows = buildScoreBreakdown(guests, sortedQuestions, answers)
    .sort((a, b) => b.total - a.total)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/70 border border-slate-600 rounded-2xl p-4 overflow-x-auto"
    >
      <h2 className="font-party text-2xl text-blue-300 text-center mb-1">📊 Desglose de puntajes</h2>
      <p className="text-center text-gray-400 font-chalk text-sm mb-4">
        Puntos por pregunta. El total debe coincidir con el ranking.
      </p>

      <table className="w-full min-w-[520px] text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 sticky left-0 bg-slate-800 z-10 text-gray-300">Jugador</th>
            {sortedQuestions.map((q, i) => (
              <th key={q.id} className="p-2 text-center text-gray-300 whitespace-nowrap">
                <div>P{i + 1}</div>
                {isBombQuestion(q) && (
                  <div className="text-red-400 text-xs font-bold">💣 x2</div>
                )}
              </th>
            ))}
            <th className="p-2 text-center text-yellow-300 font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ participant, perQuestion, total }) => {
            const rankingScore = Number(participant.score || 0)
            const matches = Math.abs(rankingScore - total) < 0.001
            return (
              <tr key={participant.id} className="border-t border-slate-700">
                <td className="p-2 sticky left-0 bg-slate-800 z-10 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <AvatarFace avatar={participant.avatar} size="xs" />
                    {participant.name}
                  </span>
                </td>
                {perQuestion.map(cell => (
                  <td
                    key={cell.questionId}
                    className={`p-2 text-center font-chalk text-base ${
                      !cell.answered
                        ? 'text-gray-500'
                        : cell.points === 0
                        ? 'text-red-400'
                        : cell.points >= cell.max
                        ? 'text-green-400'
                        : 'text-yellow-300'
                    }`}
                  >
                    {formatPts(cell.points)}
                    {(cell.extras?.lucky || cell.extras?.hint || cell.extras?.discard) && (
                      <div className="text-[11px] leading-none mt-0.5">
                        {cell.extras.lucky ? '🍀' : ''}
                        {cell.extras.hint ? '💡' : ''}
                        {cell.extras.discard ? '❌' : ''}
                      </div>
                    )}
                  </td>
                ))}
                <td className={`p-2 text-center font-party text-lg ${matches ? 'text-yellow-300' : 'text-red-400'}`}>
                  {formatPts(total)}
                  {!matches && (
                    <div className="text-[10px] font-sans text-red-300">ranking: {formatPts(rankingScore)}</div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </motion.div>
  )
}

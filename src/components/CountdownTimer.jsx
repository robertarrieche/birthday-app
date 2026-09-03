import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function CountdownTimer({ seconds, endAt, onExpire }) {
  const getRemainingSeconds = () => {
    if (!endAt) return seconds
    const diffMs = new Date(endAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diffMs / 1000))
  }

  const [timeLeft, setTimeLeft] = useState(getRemainingSeconds())

  useEffect(() => {
    setTimeLeft(getRemainingSeconds())
    const interval = setInterval(() => {
      setTimeLeft(() => {
        const remaining = getRemainingSeconds()
        if (remaining <= 0) {
          clearInterval(interval)
          onExpire?.()
          return 0
        }
        return remaining
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [seconds, endAt, onExpire])

  const progress = timeLeft / seconds
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const isUrgent = timeLeft <= 10

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="#1e293b" strokeWidth="6" />
        <motion.circle
          cx="48" cy="48" r={RADIUS}
          fill="none"
          stroke={isUrgent ? '#ef4444' : '#3b82f6'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transition={{ duration: 0.5 }}
        />
      </svg>
      <motion.span
        key={timeLeft}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className={`absolute font-party text-2xl ${isUrgent ? 'text-red-400' : 'text-white'}`}
      >
        {timeLeft}
      </motion.span>
    </div>
  )
}

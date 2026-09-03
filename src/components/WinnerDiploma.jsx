import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AVATARS } from '../lib/avatars'

export default function WinnerDiploma({ winner }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  if (!winner) return null

  const avatar = AVATARS.find(a => a.id === winner.avatar)

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = 900
    const h = 1200
    canvas.width = w
    canvas.height = h

    const bg = ctx.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, '#0f172a')
    bg.addColorStop(0.5, '#1e3a5f')
    bg.addColorStop(1, '#0f172a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = '#facc15'
    ctx.lineWidth = 14
    ctx.strokeRect(36, 36, w - 72, h - 72)
    ctx.strokeStyle = '#93c5fd'
    ctx.lineWidth = 3
    ctx.strokeRect(56, 56, w - 112, h - 112)

    ctx.fillStyle = '#93c5fd'
    ctx.font = '28px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('EL CUMPLE DE ROBERT', w / 2, 140)

    ctx.fillStyle = '#facc15'
    ctx.font = 'bold 64px Bangers, Impact, sans-serif'
    ctx.fillText('DIPLOMA', w / 2, 230)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '32px "Patrick Hand", cursive, sans-serif'
    ctx.fillText('de Conocedor Oficial', w / 2, 285)

    ctx.font = '120px sans-serif'
    ctx.fillText('👑', w / 2, 430)
    ctx.font = '140px sans-serif'
    ctx.fillText(avatar?.emoji || '🎓', w / 2, 580)

    ctx.fillStyle = '#fde68a'
    ctx.font = 'bold 56px Inter, sans-serif'
    ctx.fillText(winner.name, w / 2, 680)

    ctx.fillStyle = '#93c5fd'
    ctx.font = '36px Inter, sans-serif'
    ctx.fillText(`${winner.score} puntos`, w / 2, 750)

    ctx.fillStyle = '#cbd5e1'
    ctx.font = '28px "Patrick Hand", cursive, sans-serif'
    ctx.fillText('Ganó el examen sobre el cumpleañero', w / 2, 860)
    ctx.fillText('y demostró saber demasiado 👀', w / 2, 910)

    ctx.fillStyle = '#64748b'
    ctx.font = '22px Inter, sans-serif'
    ctx.fillText('Compartilo. Es tu momento de gloria.', w / 2, 1080)

    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `diploma-${winner.name}.png`
    a.click()
    setReady(true)
  }

  return (
    <div className="pt-2">
      <canvas ref={canvasRef} className="hidden" />
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={download}
        className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold transition-all text-slate-900"
      >
        {ready ? '📸 ¡Diploma descargado!' : '📸 Diploma del ganador'}
      </motion.button>
      <p className="text-center text-gray-500 text-xs mt-1 font-chalk">
        Se guarda una imagen para compartir en WhatsApp
      </p>
    </div>
  )
}

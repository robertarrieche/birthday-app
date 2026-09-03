import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { AVATARS } from '../lib/avatars'
import { useGameStore } from '../store/useGameStore'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'robert2026'

export default function LoginScreen() {
  const setCurrentUser = useGameStore(s => s.setCurrentUser)
  const [mode, setMode] = useState('choose') // 'choose' | 'guest' | 'admin'
  const [name, setName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGuestJoin = async () => {
    if (!name.trim()) return setError('Escribe tu nombre')
    if (!selectedAvatar) return setError('Elige un avatar')
    setLoading(true)
    setError('')
    try {
      const { data, error: dbErr } = await supabase
        .from('participants')
        .insert({ name: name.trim(), avatar: selectedAvatar, score: 0, has_answered: false, powerups: {} })
        .select()
        .single()
      if (dbErr) throw dbErr
      const user = { id: data.id, name: data.name, avatar: data.avatar, isAdmin: false }
      setCurrentUser(user)
      // Remove from DB if user closes the tab
      window.addEventListener('beforeunload', () => {
        navigator.sendBeacon(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/participants?id=eq.${data.id}`,
          null) // fallback — real cleanup via fetchInitialData on rejoin
      })
    } catch (e) {
      setError(e.message || 'Error al unirse')
    }
    setLoading(false)
  }

  const handleAdminJoin = async () => {
    if (password !== ADMIN_PASSWORD) return setError('Contraseña incorrecta')
    setLoading(true)
    setError('')
    try {
      // Upsert admin participant
      const { data, error: dbErr } = await supabase
        .from('participants')
        .upsert({ id: 'admin', name: 'Robert 🎂', avatar: 'rockstar', score: 0, has_answered: false, is_admin: true })
        .select()
        .single()
      if (dbErr) throw dbErr
      setCurrentUser({ id: 'admin', name: 'Robert 🎂', avatar: 'rockstar', isAdmin: true })
    } catch (e) {
      setError(e.message || 'Error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-blue-500 opacity-20"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [-20, 20, -20], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-6xl mb-3"
          >🎂</motion.div>
          <h1 className="font-party text-4xl text-blue-400 mb-1">El Cumple de Robert</h1>
          <p className="text-gray-400 font-chalk text-lg">Examen sobre el cumpleañero</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <button
                onClick={() => setMode('guest')}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 glow-blue"
              >
                🎓 Soy invitado — Unirme al examen
              </button>
              <button
                onClick={() => setMode('admin')}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-gray-300 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                🔐 Soy Robert — Acceso admin
              </button>
            </motion.div>
          )}

          {mode === 'guest' && (
            <motion.div
              key="guest"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 border border-blue-900 space-y-5"
            >
              <button onClick={() => setMode('choose')} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                ← Volver
              </button>
              <h2 className="text-xl font-bold text-blue-300">¿Cómo te llamas?</h2>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGuestJoin()}
                placeholder="Tu nombre..."
                maxLength={20}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              
              <div>
                <h2 className="text-xl font-bold text-blue-300 mb-3">Elige tu avatar</h2>
                <div className="grid grid-cols-4 gap-2">
                  {AVATARS.map(av => (
                    <motion.button
                      key={av.id}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all duration-200 ${
                        selectedAvatar === av.id
                          ? 'border-blue-400 bg-blue-900/50 scale-110'
                          : 'border-slate-600 bg-slate-700 hover:border-blue-600'
                      }`}
                    >
                      <span className="text-2xl">{av.emoji}</span>
                      <span className="text-xs text-gray-400 mt-1 leading-tight text-center">{av.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm text-center">
                  ⚠️ {error}
                </motion.p>
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleGuestJoin}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold text-lg transition-all duration-200"
              >
                {loading ? '⏳ Entrando...' : '🚀 Entrar a la sala'}
              </motion.button>
            </motion.div>
          )}

          {mode === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 border border-yellow-900 space-y-4"
            >
              <button onClick={() => setMode('choose')} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                ← Volver
              </button>
              <div className="text-center">
                <span className="text-4xl">🎂</span>
                <h2 className="text-xl font-bold text-yellow-400 mt-2">Acceso del Cumpleañero</h2>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminJoin()}
                placeholder="Contraseña secreta..."
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
              />
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm text-center">
                  ⚠️ {error}
                </motion.p>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAdminJoin}
                disabled={loading}
                className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 rounded-xl font-bold text-lg transition-all duration-200"
              >
                {loading ? '⏳...' : '🔓 Entrar como Admin'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

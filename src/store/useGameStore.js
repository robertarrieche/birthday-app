import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const savedUser = (() => {
  try { return JSON.parse(localStorage.getItem('birthday_user')) } catch { return null }
})()

// Singleton channel — survives React StrictMode remounts
let gameChannel = null
let channelSubscribed = false

function ensureChannel(get, set) {
  if (gameChannel) return gameChannel

  gameChannel = supabase.channel('game-room', {
    config: { broadcast: { self: false } },
  })

  gameChannel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, (payload) => {
      if (payload.new) set({ gameState: payload.new })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, async (payload) => {
      const { data } = await supabase.from('participants').select('*').order('created_at')
      if (data) set({ participants: data })
      const currentUser = get().currentUser
      if (payload.eventType === 'DELETE' && currentUser && payload.old?.id === currentUser.id) {
        localStorage.removeItem('birthday_user')
        set({ currentUser: null })
      }
    })
    .on('broadcast', { event: 'reaction' }, (msg) => {
      const data = msg.payload ?? msg
      if (!data?.emoji) return
      const id = Date.now() + Math.random()
      get().addReaction({ ...data, id })
      setTimeout(() => get().removeReaction(id), 3000)
    })
    .subscribe((status) => {
      channelSubscribed = status === 'SUBSCRIBED'
      set({ channelReady: channelSubscribed })
    })

  return gameChannel
}

export const useGameStore = create((set, get) => ({
  currentUser: savedUser,
  gameState: null,
  participants: [],
  questions: [],
  reactions: [],
  channelReady: false,

  setCurrentUser: (user) => {
    if (user) localStorage.setItem('birthday_user', JSON.stringify(user))
    else localStorage.removeItem('birthday_user')
    set({ currentUser: user })
  },
  setGameState: (gs) => set({ gameState: gs }),
  setParticipants: (p) => set({ participants: p }),
  setQuestions: (q) => set({ questions: q }),

  addReaction: (reaction) => set(state => ({
    reactions: [...state.reactions, reaction].slice(-20),
  })),
  removeReaction: (id) => set(state => ({
    reactions: state.reactions.filter(r => r.id !== id),
  })),

  subscribeToGame: () => {
    ensureChannel(get, set)
    // Don't tear down on StrictMode remount — keep channel alive
    return () => {}
  },

  fetchInitialData: async () => {
    const [gsRes, partRes, qRes] = await Promise.all([
      supabase.from('game_state').select('*').single(),
      supabase.from('participants').select('*').order('created_at'),
      supabase.from('questions').select('*').order('order_index'),
    ])
    if (gsRes.data) set({ gameState: gsRes.data })
    if (partRes.data) set({ participants: partRes.data })
    if (qRes.data) set({ questions: qRes.data })
  },

  sendReaction: async (emoji) => {
    const { currentUser } = get()
    if (!currentUser) return

    const payload = {
      userId: currentUser.id,
      userName: currentUser.name,
      avatar: currentUser.avatar,
      emoji,
    }

    // Show immediately on sender's screen (optimistic)
    const id = Date.now() + Math.random()
    get().addReaction({ ...payload, id })
    setTimeout(() => get().removeReaction(id), 3000)

    // Broadcast to everyone else
    const channel = ensureChannel(get, set)
    if (!channelSubscribed) return
    await channel.send({ type: 'broadcast', event: 'reaction', payload })
  },
}))

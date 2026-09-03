import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from './store/useGameStore'
import { supabase } from './lib/supabase'
import LoginScreen from './screens/LoginScreen'
import WaitingRoom from './screens/WaitingRoom'
import ExamScreen from './screens/ExamScreen'
import ResultsScreen from './screens/ResultsScreen'
import AdminPanel from './screens/AdminPanel'
import ReactionOverlay from './components/ReactionOverlay'

const PAGE_TRANSITION = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
  transition: { duration: 0.4 }
}

export default function App() {
  const { currentUser, gameState, reactions, fetchInitialData, subscribeToGame } = useGameStore()
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  useEffect(() => {
    const init = async () => {
      await fetchInitialData()
      // If we have a saved user, verify they still exist in DB
      if (currentUser && !currentUser.isAdmin) {
        const { data } = await supabase
          .from('participants')
          .select('id')
          .eq('id', currentUser.id)
          .single()
        if (!data) {
          // Participant was cleaned up — re-insert them
          const { data: reinserted, error } = await supabase
            .from('participants')
            .insert({ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, score: 0, has_answered: false, powerups: {} })
            .select()
            .single()
          if (error) {
            // If truly can't rejoin, clear session and show login
            useGameStore.getState().setCurrentUser(null)
          }
        }
      }
    }
    init()
    const unsub = subscribeToGame()
    return unsub
  }, [])

  const status = gameState?.status || 'waiting'

  // Not logged in → Login screen
  if (!currentUser) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="login" {...PAGE_TRANSITION}>
          <LoginScreen />
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <>
      <ReactionOverlay reactions={reactions} />

      {/* Admin panel overlay */}
      <AnimatePresence>
        {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
      </AnimatePresence>

      {/* Admin quick bar */}
      {currentUser.isAdmin && (
        <div className="fixed top-3 right-3 z-40 flex gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAdminPanel(true)}
            className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-sm font-bold transition-all shadow-lg"
          >
            ⚙️ Preguntas
          </motion.button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {status === 'waiting' && (
          <motion.div key="waiting" {...PAGE_TRANSITION}>
            <WaitingRoom />
          </motion.div>
        )}
        {status === 'exam' && (
          <motion.div key="exam" {...PAGE_TRANSITION}>
            <ExamScreen />
          </motion.div>
        )}
        {status === 'finished' && (
          <motion.div key="results" {...PAGE_TRANSITION}>
            <ResultsScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

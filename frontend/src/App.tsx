import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import SidebarLayout from './components/SidebarLayout'
import PageTransition from './components/PageTransition'
import HomePage from './pages/HomePage'
import ResumeInterviewPage from './pages/ResumeInterviewPage'
import TextInterviewPage from './pages/TextInterviewPage'
import VoiceInterviewPage from './pages/VoiceInterviewPage'

export default function App() {
  const location = useLocation()
  return (
    <SidebarLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <HomePage />
              </PageTransition>
            }
          />
          <Route
            path="/text"
            element={
              <PageTransition>
                <TextInterviewPage />
              </PageTransition>
            }
          />
          <Route
            path="/voice"
            element={
              <PageTransition>
                <VoiceInterviewPage />
              </PageTransition>
            }
          />
          <Route
            path="/resume"
            element={
              <PageTransition>
                <ResumeInterviewPage />
              </PageTransition>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </SidebarLayout>
  )
}

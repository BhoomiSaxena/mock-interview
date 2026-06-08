import { motion } from 'framer-motion'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="min-h-[calc(100vh-3rem)]"
      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
      transition={{ duration: 0.32, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}

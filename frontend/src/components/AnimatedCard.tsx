import { motion } from 'framer-motion'

export default function AnimatedCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <motion.div
      className="glass group relative overflow-hidden p-5 sm:p-6 transition-shadow duration-200 hover:shadow-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -3 }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/12 via-indigo-500/10 to-purple-600/12" />
        <div className="absolute -top-24 right-[-60px] h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-28 left-[-60px] h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />
      </div>
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-purple-600/25 border border-white/10">
            <div className="text-white/80">{icon}</div>
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-base font-semibold">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-white/65">{subtitle}</div> : null}
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </motion.div>
  )
}

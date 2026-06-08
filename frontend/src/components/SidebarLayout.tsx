import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaHome, FaMicrophoneAlt, FaRegComments, FaRegFilePdf } from 'react-icons/fa'
import AnimatedBackground from './AnimatedBackground'

const navItems = [
  { to: '/', label: 'Home', icon: FaHome },
  { to: '/text', label: 'Text Interview', icon: FaRegComments },
  { to: '/voice', label: 'Voice Interview', icon: FaMicrophoneAlt },
  { to: '/resume', label: 'Resume Interview', icon: FaRegFilePdf },
]

function NavItem({ to, label, icon: Icon }: (typeof navItems)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-200 ease-out',
          isActive
            ? 'bg-white/10 text-white border border-white/10'
            : 'text-white/70 hover:text-white hover:bg-white/10',
        ].join(' ')
      }
      end={to === '/'}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 border border-white/10">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="font-medium">{label}</span>
    </NavLink>
  )
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[280px,1fr]">
          <motion.aside
            className="glass p-4 sm:p-5 md:sticky md:top-6 md:h-[calc(100vh-3rem)]"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs tracking-wide text-white/60">AI Mock Interview</div>
                <div className="text-lg font-semibold">Assistant</div>
              </div>
              <div className="hidden rounded-xl bg-white/10 px-2 py-1 text-[11px] text-white/60 md:block">
                v1
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>

            <div className="mt-4 glass p-3">
              <div className="text-sm font-medium">Tips</div>
              <ul className="mt-2 space-y-2 text-xs text-white/70">
                <li>Upload resume for tailored questions.</li>
                <li>Answer out loud and keep it structured.</li>
                <li>Ask for a follow-up after feedback.</li>
              </ul>
            </div>
          </motion.aside>

          <main className="min-h-[calc(100vh-3rem)] pb-10">{children}</main>
        </div>
      </div>
    </div>
  )
}

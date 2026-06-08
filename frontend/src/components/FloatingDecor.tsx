import { motion } from 'framer-motion'
import {
  FaMicrophoneAlt,
  FaRegFilePdf,
  FaRegComments,
  FaRegLightbulb,
} from 'react-icons/fa'

type FloatingIconProps = {
  Icon: React.ComponentType<{ className?: string }>
  className: string
  delay: number
  duration: number
}

function FloatingIcon({ Icon, className, delay, duration }: FloatingIconProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      <motion.div
        className="animate-floaty"
        style={{ animationDuration: `${duration}s` }}
      >
        <Icon className="h-full w-full" />
      </motion.div>
    </motion.div>
  )
}

export default function FloatingDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-500/30 via-indigo-500/25 to-purple-500/30 blur-3xl animate-glow" />
      <div className="absolute bottom-[-220px] right-[-220px] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-purple-500/20 via-indigo-500/20 to-blue-500/20 blur-3xl" />

      <FloatingIcon
        Icon={FaRegComments}
        className="absolute left-[8%] top-[18%] h-10 w-10 text-white/18"
        delay={0.15}
        duration={7}
      />
      <FloatingIcon
        Icon={FaMicrophoneAlt}
        className="absolute right-[10%] top-[22%] h-12 w-12 text-white/15"
        delay={0.25}
        duration={8}
      />
      <FloatingIcon
        Icon={FaRegFilePdf}
        className="absolute left-[18%] bottom-[18%] h-11 w-11 text-white/14"
        delay={0.35}
        duration={9}
      />
      <FloatingIcon
        Icon={FaRegLightbulb}
        className="absolute right-[18%] bottom-[12%] h-10 w-10 text-white/16"
        delay={0.45}
        duration={6}
      />
    </div>
  )
}

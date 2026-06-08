import { motion, type HTMLMotionProps } from 'framer-motion'
import { Link, type LinkProps } from 'react-router-dom'

const buttonTransition = { type: 'spring' as const, stiffness: 420, damping: 28 }

export function MotionButton(
  props: HTMLMotionProps<'button'> & { hoverScale?: number }
) {
  const { hoverScale = 1.05, ...rest } = props
  return (
    <motion.button
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: 0.98 }}
      transition={buttonTransition}
      {...rest}
    />
  )
}

const MotionLinkBase = motion.create(Link as unknown as React.ComponentType<LinkProps>)

export function MotionLink(props: LinkProps & { hoverScale?: number }) {
  const { hoverScale = 1.05, ...rest } = props
  return (
    <MotionLinkBase
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: 0.98 }}
      transition={buttonTransition}
      {...(rest as unknown as Record<string, unknown>)}
    />
  )
}

import { motion } from 'framer-motion'
import { FaMicrophoneAlt, FaRegComments, FaRegFilePdf, FaStar } from 'react-icons/fa'
import AnimatedCard from '../components/AnimatedCard'
import { MotionLink } from '../components/MotionPrimitives'

export default function HomePage() {
  return (
    <div className="space-y-6">
      <motion.section
        className="glass p-6 md:p-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 backdrop-blur px-3 py-1 text-xs text-white/70">
              <FaStar className="text-indigo-300" />
              Personalized questions + instant feedback
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              AI Mock Interview Assistant
            </h1>
            <p className="mt-3 text-white/70">
              Practice like a real product. Generate role-specific questions, answer by text or voice,
              and get actionable feedback — tailored to your resume.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <MotionLink className="btn btn-primary" to="/text">
              <FaRegComments />
              Start Text Interview
            </MotionLink>
            <MotionLink className="btn" to="/resume">
              <FaRegFilePdf />
              Upload Resume
            </MotionLink>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-3">
        <MotionLink to="/text" className="block">
          <AnimatedCard
            title="Text Interview"
            subtitle="Chat-style practice with quick evaluation"
            icon={<FaRegComments />}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Best for focused iterations</span>
              <span className="text-xs text-indigo-200">Open →</span>
            </div>
          </AnimatedCard>
        </MotionLink>

        <MotionLink to="/voice" className="block">
          <AnimatedCard
            title="Voice Interview"
            subtitle="Record and transcribe your answers"
            icon={<FaMicrophoneAlt />}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Practice delivery and clarity</span>
              <span className="text-xs text-indigo-200">Open →</span>
            </div>
          </AnimatedCard>
        </MotionLink>

        <MotionLink to="/resume" className="block">
          <AnimatedCard
            title="Resume Interview"
            subtitle="Upload PDF and generate tailored questions"
            icon={<FaRegFilePdf />}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Project-driven questions</span>
              <span className="text-xs text-indigo-200">Open →</span>
            </div>
          </AnimatedCard>
        </MotionLink>
      </div>

      <motion.section
        className="glass p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1 }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-4">
            <div className="text-sm font-semibold">Structured Questions</div>
            <div className="mt-1 text-xs text-white/65">Behavioral + technical, tuned to role & level.</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-4">
            <div className="text-sm font-semibold">Feedback That Helps</div>
            <div className="mt-1 text-xs text-white/65">Strengths, improvements, and a suggested answer.</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-4">
            <div className="text-sm font-semibold">Resume-Aware</div>
            <div className="mt-1 text-xs text-white/65">Projects and skills show up in prompts.</div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}

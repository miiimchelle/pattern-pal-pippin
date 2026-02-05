import { useEffect, useState } from 'react'

function DenkwerkLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 58 28"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="11"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="12"
        letterSpacing="0.12em"
      >
        DENK
      </text>
      <text
        x="0"
        y="25"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="12"
        letterSpacing="0.05em"
      >
        WERK
      </text>
    </svg>
  )
}

function GlitchText({ text }: { text: string }) {
  const [glitch, setGlitch] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 100)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className="relative inline-block">
      <span className={glitch ? 'opacity-0' : ''}>{text}</span>
      {glitch && (
        <>
          <span className="absolute inset-0 text-cyan-400 translate-x-[2px]">{text}</span>
          <span className="absolute inset-0 text-red-400 -translate-x-[2px]">{text}</span>
        </>
      )}
    </span>
  )
}

function TypeWriter({ text, delay = 100 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
      }
    }, delay)
    return () => clearInterval(timer)
  }, [text, delay])

  useEffect(() => {
    const cursor = setInterval(() => setShowCursor((s) => !s), 500)
    return () => clearInterval(cursor)
  }, [])

  return (
    <span>
      {displayed}
      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} text-orange-400`}>|</span>
    </span>
  )
}

export default function Hero() {
  return (
    <div className="relative z-10 flex flex-col items-center text-center max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <p className="text-neutral-500 font-mono text-sm">
          <TypeWriter text="system.online" delay={80} />
        </p>
      </div>

      <p className="text-orange-400 font-mono text-sm tracking-[0.5em] uppercase mb-6 animate-pulse">
        &lt;/&gt; VIBE CODING ENABLED
      </p>

      <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-6">
        <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,146,60,0.5)]">
          INTO DESIGN
        </span>
        <br />
        <GlitchText text="SYSTEMS" />
        <br />
        <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 bg-clip-text text-transparent">
          HACKATHON
        </span>
      </h1>

      <div className="flex items-center gap-6 mb-10">
        <div className="h-px w-20 bg-gradient-to-r from-transparent to-orange-500/50" />
        <p className="text-7xl md:text-8xl font-black bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
          2026
        </p>
        <div className="h-px w-20 bg-gradient-to-l from-transparent to-orange-500/50" />
      </div>

      <div className="font-mono text-neutral-600 text-sm space-y-1">
        <p>
          <span className="text-orange-400">const</span> hackathon = {'{'}
        </p>
        <p className="pl-4">
          <span className="text-cyan-400">team</span>:{' '}
          <span className="text-green-400">"Denkwerk"</span>,
        </p>
        <p className="pl-4">
          <span className="text-cyan-400">vibes</span>:{' '}
          <span className="text-green-400">"increasing"</span>,
        </p>
        <p className="pl-4">
          <span className="text-cyan-400">energy</span>:{' '}
          <span className="text-amber-400">Infinity</span>,
        </p>
        <p>{'}'}</p>
      </div>

      <div className="mt-10 flex items-center gap-4">
        <div className="h-px w-12 bg-neutral-800" />
        <DenkwerkLogo className="h-16 w-auto text-neutral-400" />
        <div className="h-px w-12 bg-neutral-800" />
      </div>

      <div className="mt-8 flex items-center gap-2 text-neutral-700 font-mono text-xs">
        <span className="animate-pulse">●</span>
        <span>building the future, one component at a time</span>
      </div>
    </div>
  )
}

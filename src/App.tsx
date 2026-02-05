import Hero from './components/Hero'

function FloatingOrb({ delay, size, x, y }: { delay: number; size: number; x: number; y: number }) {
  return (
    <div
      className="absolute rounded-full blur-3xl animate-pulse opacity-30"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        background: 'radial-gradient(circle, rgba(251,146,60,0.8) 0%, transparent 70%)',
        animationDelay: `${delay}s`,
        animationDuration: '4s',
      }}
    />
  )
}

function App() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Animated gradient overlays */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.2),transparent_50%)] animate-pulse"
        style={{ animationDuration: '5s' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(234,88,12,0.15),transparent_50%)]" />

      {/* Floating orbs */}
      <FloatingOrb delay={0} size={300} x={10} y={20} />
      <FloatingOrb delay={1} size={200} x={80} y={60} />
      <FloatingOrb delay={2} size={250} x={70} y={10} />
      <FloatingOrb delay={1.5} size={180} x={20} y={70} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent animate-scan"
          style={{
            animation: 'scan 8s linear infinite',
          }}
        />
      </div>

      {/* Hero Content */}
      <Hero />

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 text-neutral-800 font-mono text-xs">
        <p>v2.0.26</p>
      </div>
      <div className="absolute top-8 right-8 text-neutral-800 font-mono text-xs">
        <p>FEB 2026</p>
      </div>
      <div className="absolute bottom-8 left-8 text-neutral-800 font-mono text-xs">
        <p>48°N 11°E</p>
      </div>
      <div className="absolute bottom-8 right-8 text-neutral-800 font-mono text-xs">
        <p>MUNICH</p>
      </div>

      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

      <style>{`
        @keyframes scan {
          0% { top: -2px; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  )
}

export default App

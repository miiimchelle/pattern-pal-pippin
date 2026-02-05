import { useState, useRef, useEffect } from 'react'

const PLAYLIST = [
  { title: 'JUST BUILD IT', file: '/just_build_it.mp3' },
  // { title: 'VIBE MODE', file: '/vibe_mode.mp3' },
  // { title: 'HACKATHON ANTHEM', file: '/hackathon_anthem.mp3' },
]

const NUM_BARS = 28

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [bars, setBars] = useState<number[]>(Array(NUM_BARS).fill(20))
  const [currentTrack, setCurrentTrack] = useState(0)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)
  const [isClosed, setIsClosed] = useState(false)
  const [position, setPosition] = useState({ x: 24, y: 24 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      if (currentTrack < PLAYLIST.length - 1) {
        setCurrentTrack((prev) => prev + 1)
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentTrack])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      const wasPlaying = !audio.paused
      audio.src = PLAYLIST[currentTrack].file
      audio.load()
      if (wasPlaying || isPlaying) {
        audio.play()
        setIsPlaying(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack])

  // Initialize Web Audio API for real frequency visualization
  const initAudioContext = () => {
    if (audioContextRef.current || !audioRef.current) return

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 64
    analyser.smoothingTimeConstant = 0.8

    const source = audioContext.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceRef.current = source
  }

  // Animate the visualizer bars with real frequency data
  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(NUM_BARS).fill(15))
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const analyser = analyserRef.current
    if (!analyser) {
      // Fallback to random animation if no analyser
      const interval = setInterval(() => {
        setBars(
          Array(NUM_BARS)
            .fill(0)
            .map(() => Math.random() * 100)
        )
      }, 80)
      return () => clearInterval(interval)
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateBars = () => {
      analyser.getByteFrequencyData(dataArray)
      const newBars: number[] = []
      const step = Math.floor(dataArray.length / NUM_BARS)
      for (let i = 0; i < NUM_BARS; i++) {
        const value = dataArray[i * step] || 0
        newBars.push((value / 255) * 100)
      }
      setBars(newBars)
      animationRef.current = requestAnimationFrame(updateBars)
    }

    updateBars()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isPlaying])

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX + position.x,
      y: e.clientY + position.y,
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: dragOffset.current.x - e.clientX,
        y: dragOffset.current.y - e.clientY,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      // Initialize audio context on first play (requires user interaction)
      initAudioContext()
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume()
      }
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const playNext = () => {
    setCurrentTrack((prev) => (prev + 1) % PLAYLIST.length)
  }

  const playPrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
    } else {
      setCurrentTrack((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length)
    }
  }

  const selectTrack = (index: number) => {
    initAudioContext()
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
    setCurrentTrack(index)
    setIsPlaying(true)
    setTimeout(() => audioRef.current?.play(), 50)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const time = Number(e.target.value)
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const vol = Number(e.target.value)
    audioRef.current.volume = vol
    setVolume(vol)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00'
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Closed state - show small floating button to reopen
  if (isClosed) {
    return (
      <div
        className="fixed z-50"
        style={{ bottom: position.y, right: position.x }}
      >
        <audio ref={audioRef} src={PLAYLIST[currentTrack].file} preload="metadata" />
        <button
          onClick={() => setIsClosed(false)}
          className="w-12 h-12 flex items-center justify-center select-none"
          style={{
            background: 'linear-gradient(180deg, #4a6a8a 0%, #2a4a6a 50%, #1a3a5a 100%)',
            border: '2px solid #5a5a5a',
            borderBottom: '2px solid #0a0a0a',
            borderRight: '2px solid #0a0a0a',
            boxShadow: 'inset 2px 2px 0 #6a6a6a',
          }}
        >
          <div
            className="w-5 h-5 bg-orange-500"
            style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
          />
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed z-50"
      style={{ bottom: position.y, right: position.x }}
    >
      <audio ref={audioRef} src={PLAYLIST[currentTrack].file} preload="metadata" />

      {/* Main Winamp container */}
      <div
        className={`${isMinimized ? 'w-[280px]' : 'w-[500px]'} select-none transition-all duration-200`}
        style={{
          background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 3%, #1a1a1a 97%, #0a0a0a 100%)',
          border: '2px solid #5a5a5a',
          borderBottom: '2px solid #0a0a0a',
          borderRight: '2px solid #0a0a0a',
          boxShadow: 'inset 2px 2px 0 #6a6a6a',
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-3 py-2 cursor-move"
          style={{
            background: 'linear-gradient(180deg, #4a6a8a 0%, #2a4a6a 50%, #1a3a5a 100%)',
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 bg-orange-500"
              style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
            />
            <span className="text-base font-bold text-white tracking-tight">VIBEAMP 2026</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-6 h-6 text-sm bg-[#3a3a3a] border-2 border-t-[#6a6a6a] border-l-[#6a6a6a] border-b-[#1a1a1a] border-r-[#1a1a1a] text-[#8a8a8a] leading-none hover:bg-[#4a4a4a]"
            >
              _
            </button>
            <button
              onClick={() => setIsClosed(true)}
              className="w-6 h-6 text-sm bg-[#3a3a3a] border-2 border-t-[#6a6a6a] border-l-[#6a6a6a] border-b-[#1a1a1a] border-r-[#1a1a1a] text-[#8a8a8a] leading-none hover:bg-[#4a4a4a]"
            >
              ×
            </button>
          </div>
        </div>

        {/* Minimized bar with basic controls */}
        {isMinimized && (
          <div className="flex items-center justify-between px-2 py-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 text-lg flex items-center justify-center"
              style={{
                background: isPlaying
                  ? 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)'
                  : 'linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 50%, #2a2a2a 100%)',
                border: '2px solid',
                borderColor: isPlaying
                  ? '#1a1a1a #6a6a6a #6a6a6a #1a1a1a'
                  : '#6a6a6a #1a1a1a #1a1a1a #6a6a6a',
                color: '#ccc',
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div
              className="flex-1 mx-2 text-sm truncate font-mono"
              style={{ color: '#00ff00', textShadow: '0 0 6px #00ff00' }}
            >
              {isPlaying ? '▶ ' : '■ '}
              {PLAYLIST[currentTrack].title}
            </div>
            <div className="text-sm font-mono" style={{ color: '#00ff00' }}>
              {formatTime(currentTime)}
            </div>
          </div>
        )}

        {/* Display panel */}
        {!isMinimized && (
          <div className="m-2">
            <div
              className="p-3"
              style={{
                background: '#000',
                border: '2px solid #0a0a0a',
                boxShadow: 'inset 2px 2px 6px #000',
              }}
            >
              {/* Visualizer */}
              <div className="flex gap-1 h-16 items-end mb-3 px-2">
                {bars.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 transition-all duration-75"
                    style={{
                      height: `${height}%`,
                      background: height > 80 ? '#ff0000' : height > 50 ? '#ffff00' : '#00ff00',
                      boxShadow: `0 0 4px ${height > 80 ? '#ff0000' : height > 50 ? '#ffff00' : '#00ff00'}`,
                    }}
                  />
                ))}
              </div>

              {/* Track info and time */}
              <div className="flex justify-between items-center px-2">
                <div className="flex-1 overflow-hidden">
                  <div
                    className="text-lg whitespace-nowrap"
                    style={{
                      color: '#00ff00',
                      fontFamily: 'monospace',
                      textShadow: '0 0 8px #00ff00',
                      animation: isPlaying ? 'scroll 8s linear infinite' : 'none',
                    }}
                  >
                    {isPlaying ? '▶ ' : '■ '}
                    {PLAYLIST[currentTrack].title} - IDS HACKATHON 2026
                  </div>
                </div>
                <div
                  className="text-2xl font-bold ml-4"
                  style={{
                    color: '#00ff00',
                    fontFamily: 'monospace',
                    textShadow: '0 0 10px #00ff00',
                  }}
                >
                  {formatTime(currentTime)}
                </div>
              </div>

              {/* Seek bar */}
              <div className="mt-3 px-2">
                <div
                  className="h-4 relative"
                  style={{
                    background: '#1a1a1a',
                    border: '2px solid #0a0a0a',
                  }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${(currentTime / (duration || 1)) * 100}%`,
                      background: 'linear-gradient(180deg, #6a8a6a 0%, #4a6a4a 100%)',
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Bitrate/info */}
              <div className="flex justify-between px-2 mt-2">
                <span className="text-sm text-[#00aa00] font-mono">320kbps</span>
                <span className="text-sm text-[#00aa00] font-mono">44kHz</span>
                <span className="text-sm text-[#00aa00] font-mono">stereo</span>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        {!isMinimized && (
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex gap-1">
              {/* Prev Button */}
              <button
                onClick={playPrev}
                className="w-14 h-10 text-xs font-bold flex flex-col items-center justify-center gap-0"
                style={{
                  background: 'linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 50%, #2a2a2a 100%)',
                  border: '2px solid',
                  borderColor: '#6a6a6a #1a1a1a #1a1a1a #6a6a6a',
                  color: '#ccc',
                }}
              >
                <span className="text-base leading-none">⏮</span>
                <span className="text-[8px] leading-none">PREV</span>
              </button>

              {/* Play/Pause/Stop */}
              {['▶', '⏸', '⏹'].map((icon, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (idx === 0) togglePlay()
                    if (idx === 1) {
                      audioRef.current?.pause()
                      setIsPlaying(false)
                    }
                    if (idx === 2 && audioRef.current) {
                      audioRef.current.pause()
                      audioRef.current.currentTime = 0
                      setIsPlaying(false)
                    }
                  }}
                  className="w-12 h-10 text-xl flex items-center justify-center"
                  style={{
                    background:
                      idx === 0 && isPlaying
                        ? 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)'
                        : 'linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 50%, #2a2a2a 100%)',
                    border: '2px solid',
                    borderColor:
                      idx === 0 && isPlaying
                        ? '#1a1a1a #6a6a6a #6a6a6a #1a1a1a'
                        : '#6a6a6a #1a1a1a #1a1a1a #6a6a6a',
                    color: '#ccc',
                  }}
                >
                  {icon}
                </button>
              ))}

              {/* Next Button */}
              <button
                onClick={playNext}
                className="w-14 h-10 text-xs font-bold flex flex-col items-center justify-center gap-0"
                style={{
                  background: 'linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 50%, #2a2a2a 100%)',
                  border: '2px solid',
                  borderColor: '#6a6a6a #1a1a1a #1a1a1a #6a6a6a',
                  color: '#ccc',
                }}
              >
                <span className="text-base leading-none">⏭</span>
                <span className="text-[8px] leading-none">NEXT</span>
              </button>

              {/* Playlist Toggle */}
              <button
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="w-12 h-10 text-xs font-bold flex items-center justify-center"
                style={{
                  background: showPlaylist
                    ? 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)'
                    : 'linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 50%, #2a2a2a 100%)',
                  border: '2px solid',
                  borderColor: showPlaylist
                    ? '#1a1a1a #6a6a6a #6a6a6a #1a1a1a'
                    : '#6a6a6a #1a1a1a #1a1a1a #6a6a6a',
                  color: '#ccc',
                }}
              >
                PL
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8a8a8a] font-bold">VOL</span>
              <div
                className="w-24 h-4 relative"
                style={{
                  background: '#1a1a1a',
                  border: '2px solid #0a0a0a',
                }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${volume * 100}%`,
                    background: 'linear-gradient(180deg, #6a8a6a 0%, #4a6a4a 100%)',
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={handleVolume}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playlist Panel */}
      {showPlaylist && !isMinimized && (
        <div
          className="w-[500px] mt-1 select-none"
          style={{
            background:
              'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 3%, #1a1a1a 97%, #0a0a0a 100%)',
            border: '2px solid #5a5a5a',
            borderBottom: '2px solid #0a0a0a',
            borderRight: '2px solid #0a0a0a',
            boxShadow: 'inset 2px 2px 0 #6a6a6a',
          }}
        >
          <div
            className="px-3 py-1 text-sm font-bold text-white"
            style={{
              background: 'linear-gradient(180deg, #4a6a8a 0%, #2a4a6a 50%, #1a3a5a 100%)',
            }}
          >
            PLAYLIST
          </div>
          <div
            className="m-2 max-h-40 overflow-y-auto"
            style={{
              background: '#000',
              border: '2px solid #0a0a0a',
              boxShadow: 'inset 2px 2px 6px #000',
            }}
          >
            {PLAYLIST.map((track, idx) => (
              <button
                key={idx}
                onClick={() => selectTrack(idx)}
                className="w-full px-3 py-2 text-left font-mono text-sm flex items-center gap-2 hover:bg-[#1a1a3a]"
                style={{
                  color: idx === currentTrack ? '#00ff00' : '#00aa00',
                  textShadow: idx === currentTrack ? '0 0 8px #00ff00' : 'none',
                }}
              >
                <span className="w-5">
                  {idx === currentTrack && isPlaying ? '▶' : `${idx + 1}.`}
                </span>
                <span>{track.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}

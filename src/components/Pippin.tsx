import { useMemo } from 'react';
import pippinSprite from '../assets/pippin-sprite.png';
import {
  LOADING_LINES,
  CHECKING_LINES,
  ERROR_LINES,
  VERY_HAPPY_LINES,
  EXCITED_LINES,
  PROUD_LINES,
  IDEA_LINES,
  ANGRY_WITCH_LINES,
  IDLE_LINES,
  SUCCESS_LINES,
  AT_NIGHT_LINES,
  pickRandom,
} from './pippinCopy';

// ---- Sprite grid layout ----
// The sprite is 1490×874 with a 4-column, 3-row grid.
// Row 0 (4 items): baseball-cap, lightbulb, witch-hat, top-hat
// Row 1 (3 items): sad, thinking, heart
// Row 2 (3 items): party-hat, excited, candle
//
// We scale the full image so each cell height = 120px (fills the box).
// Native cell height = 874/3 ≈ 291.  Scale = 120/291 ≈ 0.412
// background-size: 1490*0.412 ≈ 614px,  874*0.412 = 360px
const IMG_W = 614;
const IMG_H = 360;
const CELL_W = IMG_W / 4; // ~153.5
const CELL_H = IMG_H / 3; // 120

type SpritePos = [row: number, col: number];

const SPRITE: Record<string, SpritePos> = {
  idle: [0, 0],       // baseball cap
  idea: [0, 1],       // lightbulb
  angryWitch: [0, 2], // witch hat
  proud: [0, 3],      // top hat
  error: [1, 0],      // sad
  loading: [1, 1],    // thinking
  veryHappy: [1, 2],  // heart
  excited: [2, 0],    // party hat
  partyWave: [2, 1],  // excited / waving
  atNight: [2, 2],    // candle
};

// Display size for the visible container (square, centred on sprite)
const DISPLAY_SIZE = 120;

function spriteStyle(key: string): React.CSSProperties {
  const [row, col] = SPRITE[key] ?? SPRITE.idle;
  // Centre the cell within the square display box
  const offsetX = -col * CELL_W + (DISPLAY_SIZE - CELL_W) / 2;
  const offsetY = -row * CELL_H + (DISPLAY_SIZE - CELL_H) / 2;
  return {
    width: DISPLAY_SIZE,
    height: DISPLAY_SIZE,
    backgroundImage: `url(${pippinSprite})`,
    backgroundSize: `${IMG_W}px ${IMG_H}px`,
    backgroundPosition: `${offsetX}px ${offsetY}px`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    flexShrink: 0,
  };
}

// ---- Night-time check ----
function isNightTime(): boolean {
  const h = new Date().getHours();
  return h >= 21 || h < 5;
}

// ---- Mood resolution ----
export type PippinStatus = 'idle' | 'loading' | 'checking' | 'success' | 'error';

interface MoodResult {
  spriteKey: string;
  line: string;
}

function resolveMood(status: PippinStatus, consistency: number | null): MoodResult {
  // Night-time override for idle
  if (status === 'idle' && isNightTime()) {
    return { spriteKey: 'atNight', line: pickRandom(AT_NIGHT_LINES) };
  }

  switch (status) {
    case 'error':
      return { spriteKey: 'error', line: pickRandom(ERROR_LINES) };

    case 'loading':
      return { spriteKey: 'loading', line: pickRandom(LOADING_LINES) };

    case 'checking':
      return { spriteKey: 'loading', line: pickRandom(CHECKING_LINES) };

    case 'success': {
      if (consistency == null) {
        // Team-scan only — generic success
        return { spriteKey: 'proud', line: pickRandom(SUCCESS_LINES) };
      }
      if (consistency >= 85) {
        return { spriteKey: 'veryHappy', line: pickRandom(VERY_HAPPY_LINES) };
      }
      if (consistency >= 70) {
        return { spriteKey: 'excited', line: pickRandom(EXCITED_LINES) };
      }
      if (consistency >= 55) {
        return { spriteKey: 'proud', line: pickRandom(PROUD_LINES) };
      }
      if (consistency >= 40) {
        return { spriteKey: 'idea', line: pickRandom(IDEA_LINES) };
      }
      return { spriteKey: 'angryWitch', line: pickRandom(ANGRY_WITCH_LINES) };
    }

    case 'idle':
    default:
      return { spriteKey: 'idle', line: pickRandom(IDLE_LINES) };
  }
}

// ---- Component ----
interface Props {
  status: PippinStatus;
  overallConsistency: number | null;
}

export function Pippin({ status, overallConsistency }: Props) {
  // Re-pick on status/consistency change (useMemo key is the pair).
  const mood = useMemo(
    () => resolveMood(status, overallConsistency),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, overallConsistency],
  );

  return (
    <div className="flex flex-row items-center justify-center gap-2">
      {/* Sprite */}
      <div className="animate-float" style={spriteStyle(mood.spriteKey)} aria-hidden="true" />

      {/* Speech bubble — to the right of the sprite */}
      <div className="relative z-10 bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-700 leading-snug text-center max-w-[260px]">
        {mood.line}
        {/* Tail pointing left */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-gray-100" />
      </div>
    </div>
  );
}

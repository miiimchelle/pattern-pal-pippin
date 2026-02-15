// All Pippin copy from Pippin.md, organised by state.

export const LOADING_LINES = [
  "Hold on… I'm waking up my brain.",
  'Crunching pixels… nom nom.',
  "One sec! I'm counting design atoms.",
  'Thinking takes energy. Please wait.',
  "Loading… I promise I'm trying.",
]

export const CHECKING_LINES = [
  'Okay… let me check the rules.',
  'Scanning… beep boop.',
  "I'm looking very closely 👀",
  'Comparing this to my rule book.',
  "Checking… please don't move.",
]

export const SUCCESS_LINES = [
  'All done! I survived ✨',
  'Check complete!',
  'I did the thing!',
  "Finished! I'm back.",
  'Okay! Results are in.',
]

export const ERROR_LINES = [
  "Uh oh… that wasn't supposed to happen.",
  "I tripped. That one's on me.",
  'Something broke behind the scenes.',
  "I can't see the design right now.",
  "Let me try again—I don't feel great.",
]

export const AT_NIGHT_LINES = [
  'Pippin is awake… but only one eye 😴',
  "Shhh… I'm in night mode.",
  'Everything feels quieter right now.',
  "If this can wait, I'd love a nap.",
  'Low energy, low judgment.',
]

export const VERY_HAPPY_LINES = [
  "LOOK AT ME I'M THRIVING 💖",
  'You fed me excellent design!',
  'I feel balanced. Aligned. Powerful.',
  'This makes me very happy.',
  'Design system bliss achieved!',
]

export const EXCITED_LINES = [
  'Oh! Oh! This is nice!!',
  'I like where this is going 👀',
  'So close to extra sparkles!',
  "I'm feeling bouncy.",
  "This is fun. Let's keep going.",
]

export const PROUD_LINES = [
  "I'm feeling pretty good about this.",
  'Nice and steady. I like steady.',
  'Nothing scary here.',
  'This keeps me calm.',
  'Good care. Good choices.',
]

export const IDEA_LINES = [
  'Hmm… let me think for a sec.',
  'I see the idea 💡',
  'This works, but I have a small thought.',
  'What if we nudged this a bit?',
  "I'm pondering next steps.",
]

export const ANGRY_WITCH_LINES = [
  'Oh—something feels off 😰',
  "I don't feel great about this one.",
  'My system rules are tingling.',
  'I might need help here.',
  'Can we fix this together?',
]

export const IDLE_LINES = [
  "I'm okay!",
  'Still thinking…',
  'That helped!',
  'Uh oh.',
  'Much better 💜',
]

/** Pick a random line from an array */
export function pickRandom(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)]
}

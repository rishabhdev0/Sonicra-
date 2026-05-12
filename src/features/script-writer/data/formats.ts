export const SCRIPT_FORMATS = [
  {
    id: "podcast-intro",
    label: "Podcast Intro",
    icon: "🎙️",
    description: "Warm branded opening for your podcast",
    duration: "30-60 seconds",
    prompt: (details: string) =>
      `Write a podcast intro script for: ${details}. Make it warm, engaging and professional. 30-60 seconds when read aloud. No stage directions, just the spoken words.`,
  },
  {
    id: "ad-15",
    label: "15s Advertisement",
    icon: "📢",
    description: "Short punchy ad for social media",
    duration: "15 seconds",
    prompt: (details: string) =>
      `Write a 15-second advertisement script for: ${details}. Make it punchy, memorable and include a clear call to action. No stage directions, just the spoken words.`,
  },
  {
    id: "ad-30",
    label: "30s Advertisement",
    icon: "📣",
    description: "Classic radio/podcast advertisement",
    duration: "30 seconds",
    prompt: (details: string) =>
      `Write a 30-second advertisement script for: ${details}. Include a hook, value proposition and call to action. No stage directions, just the spoken words.`,
  },
  {
    id: "ad-60",
    label: "60s Advertisement",
    icon: "🎯",
    description: "Full minute commercial spot",
    duration: "60 seconds",
    prompt: (details: string) =>
      `Write a 60-second advertisement script for: ${details}. Tell a mini story, build emotion, include benefits and a strong call to action. No stage directions, just the spoken words.`,
  },
  {
    id: "youtube-intro",
    label: "YouTube Intro",
    icon: "▶️",
    description: "Hook viewers in the first 30 seconds",
    duration: "20-30 seconds",
    prompt: (details: string) =>
      `Write a YouTube video intro script for: ${details}. Hook the viewer immediately, tease what they'll learn, and tell them to subscribe. No stage directions, just the spoken words.`,
  },
  {
    id: "explainer",
    label: "Explainer Video",
    icon: "💡",
    description: "Clear explanation of a product or concept",
    duration: "60-90 seconds",
    prompt: (details: string) =>
      `Write an explainer video script for: ${details}. Start with the problem, introduce the solution, explain how it works, and end with a call to action. No stage directions, just the spoken words.`,
  },
  {
    id: "audiobook-chapter",
    label: "Audiobook Chapter",
    icon: "📚",
    description: "Opening chapter for an audiobook",
    duration: "2-3 minutes",
    prompt: (details: string) =>
      `Write the opening of an audiobook chapter about: ${details}. Use vivid, engaging narrative prose that sounds great when read aloud. No stage directions, just the spoken words.`,
  },
  {
    id: "news-report",
    label: "News Report",
    icon: "📰",
    description: "Professional news style report",
    duration: "45-60 seconds",
    prompt: (details: string) =>
      `Write a professional news report script about: ${details}. Use journalistic style, be factual and clear. No stage directions, just the spoken words.`,
  },
] as const;

export type ScriptFormat = (typeof SCRIPT_FORMATS)[number];
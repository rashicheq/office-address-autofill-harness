// Ported from the approved Compass Vibe Kit design — colours, horizon
// silhouettes and particle motifs per vibe. The backend decides WHICH vibe
// a trip has (vibes.data.js); this file only decides how that vibe looks.
import { MOTIFS } from "../assets/icons/motifs.js";

export const VIBE_PALETTE = {
  beach: {
    colors: { skyTop: "#bfe3e0", skyBot: "#eaf6ec", ground: "#2f9d95", ground2: "#7fc4b9", accent: "#ff6f59", accent2: "#ffc857", sun: "#ffcf6b" },
    horizon: { back: "M0 210 C 120 180,220 230,340 205 C 460 180,560 230,680 205 C 800 180,900 230,1020 205 C1100 190,1160 200,1200 205 L1200 300 L0 300 Z", front: "M0 235 C 100 215,200 250,320 232 C 440 214,540 250,660 232 C 780 214,880 250,1000 232 C1080 220,1150 228,1200 232 L1200 300 L0 300 Z" },
    particles: [MOTIFS.shell, MOTIFS.wave, MOTIFS.shell],
  },
  snow: {
    colors: { skyTop: "#dfe9f5", skyBot: "#f3f7fb", ground: "#6f95c4", ground2: "#a9c2e0", accent: "#2e6a9e", accent2: "#e8973c", sun: "#f5f7fb" },
    horizon: { back: "M0 300 L0 215 L110 130 L190 200 L300 100 L400 195 L510 90 L610 190 L720 120 L830 205 L940 110 L1050 200 L1160 150 L1200 180 L1200 300 Z", front: "M0 300 L0 245 L90 185 L170 235 L270 165 L360 240 L460 155 L560 235 L660 175 L760 245 L860 165 L960 240 L1080 200 L1200 230 L1200 300 Z" },
    particles: [MOTIFS.snowflake, MOTIFS.pine, MOTIFS.snowflake],
  },
  city: {
    colors: { skyTop: "#e7e1f2", skyBot: "#f6f2fb", ground: "#5c6178", ground2: "#8a8fa3", accent: "#e85d75", accent2: "#ffc93c", sun: "#ffe8a3" },
    horizon: { back: "M0 300 V190 H60 V150 H130 V210 H190 V120 H250 V200 H320 V160 H380 V230 H440 V140 H510 V210 H580 V170 H650 V220 H720 V150 H800 V205 H880 V180 H950 V230 H1030 V190 H1100 V215 H1170 V300 Z", front: "M0 300 V235 H50 V210 H110 V245 H170 V215 H230 V250 H300 V205 H370 V245 H440 V220 H510 V255 H590 V210 H670 V245 H740 V225 H820 V255 H900 V235 H980 V250 H1060 V225 H1140 V300 Z" },
    particles: [MOTIFS.building, MOTIFS.lamp, MOTIFS.building],
  },
  tropical: {
    colors: { skyTop: "#d7ecd1", skyBot: "#f2f8ee", ground: "#3e8e4f", ground2: "#7fb06a", accent: "#f2994a", accent2: "#e85d75", sun: "#ffd873" },
    horizon: { back: "M0 300 L0 210 Q60 150 120 205 Q180 140 240 200 Q300 130 360 195 Q420 150 480 210 Q540 140 600 200 Q660 160 720 205 Q780 130 840 195 Q900 150 960 210 Q1020 140 1080 200 Q1140 160 1200 205 L1200 300 Z", front: "M0 300 L0 245 Q60 200 120 240 Q180 195 240 235 Q300 190 360 230 Q420 195 480 240 Q540 195 600 235 Q660 205 720 240 Q780 190 840 230 Q900 200 960 240 Q1020 195 1080 235 Q1140 205 1200 235 L1200 300 Z" },
    particles: [MOTIFS.palm, MOTIFS.mango, MOTIFS.palm],
  },
};

export function vibeCssVars(vibeId) {
  const palette = VIBE_PALETTE[vibeId] ?? VIBE_PALETTE.beach;
  const c = palette.colors;
  return {
    "--sky-top": c.skyTop,
    "--sky-bot": c.skyBot,
    "--ground": c.ground,
    "--ground-2": c.ground2,
    "--accent": c.accent,
    "--accent-2": c.accent2,
    "--sun": c.sun,
  };
}

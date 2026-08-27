/**
 * Vendor → real logo files, from the library the user placed under
 * /public/images/app/AI_Model/<Folder>/. Filenames aren't a consistent
 * pattern (casing, hyphen-vs-underscore, product name vs vendor name,
 * "logo" vs "long_logo" naming all vary per folder) so every path here was
 * verified individually against the actual files rather than derived from
 * a slug rule.
 *
 * Falls back to a colored initials badge for any vendor not in this table
 * (e.g. a new catalog entry added later, before its logo file exists).
 */
export interface VendorLogoInfo {
  /** Square/icon mark. Path under /public, or null if no file exists yet. */
  src: string | null;
  /** Wide wordmark (icon + name baked in). Path under /public, or null. */
  longSrc: string | null;
  initials: string;
}

export const VENDOR_LOGOS: Record<string, VendorLogoInfo> = {
  // 32 core single-vendor brands (from the `vendor` field across the catalog)
  Adobe: {
    src: "/images/app/AI_Model/Adobe_Firefly/Adobe_Firefly_Logo.png",
    longSrc: "/images/app/AI_Model/Adobe_Firefly/Adobe_Firefly_long_Logo.png",
    initials: "Ad",
  },
  Anthropic: {
    src: "/images/app/AI_Model/Anthropic/Anthropic_logo.png",
    longSrc: "/images/app/AI_Model/Anthropic/Anthropic_long_logo.png",
    initials: "An",
  },
  Anysphere: {
    src: "/images/app/AI_Model/Anysphere/cursor-logo.png",
    longSrc: "/images/app/AI_Model/Anysphere/cursor-long_logo.png",
    initials: "Cu",
  },
  AWS: {
    src: "/images/app/AI_Model/AWS_Kiro/AWS_Kiro_logo.png",
    longSrc: "/images/app/AI_Model/AWS_Kiro/AWS_Kiro_long_logo.png",
    initials: "AWS",
  },
  "Beautiful.ai": {
    src: "/images/app/AI_Model/Beautiful_ai/Beautiful_ai_logo.png",
    longSrc: "/images/app/AI_Model/Beautiful_ai/Beautiful_ai_long_logo.png",
    initials: "Bt",
  },
  "Black Forest Labs": {
    src: "/images/app/AI_Model/Black_Forest_Labs/Black_Forest_Labs_logo.png",
    longSrc: "/images/app/AI_Model/Black_Forest_Labs/Black_Forest_Labs_long_logo.png",
    initials: "BF",
  },
  ByteDance: {
    src: "/images/app/AI_Model/ByteDance/bytedance-logo.png",
    longSrc: "/images/app/AI_Model/ByteDance/bytedance-long_logo.png",
    initials: "BD",
  },
  Cognition: {
    src: "/images/app/AI_Model/Cognition _Devin/Cognition_Devin_logo.png",
    longSrc: "/images/app/AI_Model/Cognition _Devin/Cognition_Devin_long_logo.png",
    initials: "Co",
  },
  Consensus: {
    src: "/images/app/AI_Model/Consensus/Consensus_logo.png",
    longSrc: "/images/app/AI_Model/Consensus/Consensus_long_logo.png",
    initials: "Cn",
  },
  DeepL: {
    src: "/images/app/AI_Model/DeepL/deepl-logo.png",
    longSrc: "/images/app/AI_Model/DeepL/DeepL_long_logo.png",
    initials: "DL",
  },
  Elicit: {
    src: "/images/app/AI_Model/Elicit/Elicit_logo.png",
    longSrc: "/images/app/AI_Model/Elicit/Elicit_long_logo.png",
    initials: "El",
  },
  Figma: {
    src: "/images/app/AI_Model/Figma/Figma_logo.png",
    longSrc: "/images/app/AI_Model/Figma/Figma_long_logo.png",
    initials: "Fi",
  },
  "Fireflies.ai": {
    src: "/images/app/AI_Model/Fireflies/Fireflies_ai_logo.png",
    longSrc: "/images/app/AI_Model/Fireflies/Fireflies_ai_long_logo.png",
    initials: "Ff",
  },
  Gamma: {
    src: "/images/app/AI_Model/Gamma/Gamma_logo.png",
    longSrc: "/images/app/AI_Model/Gamma/Gamma_long_logo.png",
    initials: "Ga",
  },
  GitHub: {
    src: "/images/app/AI_Model/GitHub_Copilot/GitHub_Copilot_logo.png",
    longSrc: "/images/app/AI_Model/GitHub_Copilot/GitHub_Copilot_long_logo.png",
    initials: "Gh",
  },
  Google: {
    src: "/images/app/AI_Model/Google_Gemini/Google_Gemini_logo.png",
    longSrc: "/images/app/AI_Model/Google_Gemini/Google_Gemini_long_logo.png",
    initials: "Go",
  },
  Julius: {
    src: "/images/app/AI_Model/Julius/Julius_logo.png",
    longSrc: "/images/app/AI_Model/Julius/Julius_long_logo.png",
    initials: "Ju",
  },
  Lovable: {
    src: "/images/app/AI_Model/Lovable/Lovable_logo.png",
    longSrc: "/images/app/AI_Model/Lovable/Lovable_long_logo.png",
    initials: "Lv",
  },
  Make: {
    src: "/images/app/AI_Model/Make/Make_logo.png",
    longSrc: "/images/app/AI_Model/Make/Make_long_logo.png",
    initials: "Mk",
  },
  Microsoft: {
    src: "/images/app/AI_Model/Microsoft_Copilot/Microsoft_Copilot_logo.png",
    longSrc: "/images/app/AI_Model/Microsoft_Copilot/Microsoft_Copilot_long_logo.png",
    initials: "Ms",
  },
  Midjourney: {
    src: "/images/app/AI_Model/Midjourney/Midjourney_logo.png",
    longSrc: "/images/app/AI_Model/Midjourney/Midjourney_long_logo.png",
    initials: "Mj",
  },
  "Moonshot AI": {
    src: "/images/app/AI_Model/Moonshot_AI_Kimi/Moonshot_AI_Kimi_logo.png",
    longSrc: "/images/app/AI_Model/Moonshot_AI_Kimi/Moonshot_AI_Kimi_long_logo.png",
    initials: "Km",
  },
  n8n: {
    src: "/images/app/AI_Model/n8n/n8n_logo.png",
    longSrc: "/images/app/AI_Model/n8n/n8n_long_logo.png",
    initials: "n8",
  },
  OpenAI: {
    src: "/images/app/AI_Model/OpenAI/OpenAI_logo.png",
    longSrc: "/images/app/AI_Model/OpenAI/OpenAI_long_logo.png",
    initials: "Oa",
  },
  "Otter.ai": {
    src: "/images/app/AI_Model/Otter_ai/Otter_logo.png",
    longSrc: "/images/app/AI_Model/Otter_ai/Otter_long_logo.png",
    initials: "Ot",
  },
  Perplexity: {
    src: "/images/app/AI_Model/Perplexity/Perplexity_logo.png",
    longSrc: "/images/app/AI_Model/Perplexity/Perplexity_long_logo.png",
    initials: "Px",
  },
  "SCB 10X": {
    src: "/images/app/AI_Model/Typhoon/Typhoon_logo.png",
    longSrc: "/images/app/AI_Model/Typhoon/Typhoon_long_logo.png",
    initials: "10X",
  },
  StackBlitz: {
    src: "/images/app/AI_Model/Bolt_New/bolt_new_logo.png",
    longSrc: "/images/app/AI_Model/Bolt_New/bolt_new_long_logo.png",
    initials: "Bo",
  },
  Vercel: {
    src: "/images/app/AI_Model/V0/V0_logo.png",
    longSrc: "/images/app/AI_Model/V0/V0_long_logo.png",
    initials: "v0",
  },
  xAI: {
    src: "/images/app/AI_Model/xAI_Grok/Grok_logo.png",
    longSrc: "/images/app/AI_Model/xAI_Grok/Grok_long_logo.png",
    initials: "xA",
  },
  "Z.ai": {
    src: "/images/app/AI_Model/Z_ai/Z_ai_logo.png",
    longSrc: "/images/app/AI_Model/Z_ai/Z_ai_long_logo.png",
    initials: "Z",
  },
  Zapier: {
    src: "/images/app/AI_Model/Zapier/zapier_logo.png",
    longSrc: "/images/app/AI_Model/Zapier/Zapier_long_logo.png",
    initials: "Zp",
  },

  // 9 more that only appear inside combined ("หลายราย" / "open-source") catalog rows
  Cline: {
    src: "/images/app/AI_Model/Cline/cline_logo.png",
    longSrc: "/images/app/AI_Model/Cline/Cline_long_logo.png",
    initials: "Cl",
  },
  Recraft: {
    src: "/images/app/AI_Model/Recraft/Recraft_logo.png",
    longSrc: "/images/app/AI_Model/Recraft/Recraft_long_logo.png",
    initials: "Rc",
  },
  Ideogram: {
    src: "/images/app/AI_Model/Ideogram/Ideogram_logo.png",
    longSrc: "/images/app/AI_Model/Ideogram/Ideogram_long_logo.png",
    initials: "Id",
  },
  Uizard: {
    src: "/images/app/AI_Model/Uizard/Uizard_logo.png",
    longSrc: "/images/app/AI_Model/Uizard/Uizard_long_logo.png",
    initials: "Uz",
  },
  Relume: {
    src: "/images/app/AI_Model/Relume/Relume_logo.png",
    longSrc: "/images/app/AI_Model/Relume/Relume_long_logo.png",
    initials: "Re",
  },
  Meta: {
    src: "/images/app/AI_Model/Meta_Llama/Meta_logo.png",
    longSrc: "/images/app/AI_Model/Meta_Llama/Meta_long_logo.png",
    initials: "Me",
  },
  Alibaba: {
    src: "/images/app/AI_Model/Alibaba_Qwen/Qwen_logo.png",
    longSrc: "/images/app/AI_Model/Alibaba_Qwen/Qwen_long_logo.png",
    initials: "Al",
  },
  NVIDIA: {
    src: "/images/app/AI_Model/NVIDIA_Nemotron/nvidia_logo.png",
    longSrc: "/images/app/AI_Model/NVIDIA_Nemotron/nvidia-long_logo.png",
    initials: "Nv",
  },
  MiniMax: {
    src: "/images/app/AI_Model/MiniMax/minimax_logo.png",
    longSrc: "/images/app/AI_Model/MiniMax/MiniMax_long_logo.png",
    initials: "Mm",
  },
};

const BADGE_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-blue-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-fuchsia-500",
  "bg-teal-500",
  "bg-orange-500",
];

export function getVendorLogoInfo(vendor: string): VendorLogoInfo {
  return (
    VENDOR_LOGOS[vendor] ?? { src: null, longSrc: null, initials: vendor.slice(0, 2).toUpperCase() }
  );
}

/** Deterministic color per vendor name, so the same vendor always gets the same fallback color. */
export function getBadgeColor(vendor: string): string {
  let hash = 0;
  for (const ch of vendor) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

/** All brand display names for the topbar logo marquee, in registry order. */
export function getAllVendorDisplayNames(): string[] {
  return Object.keys(VENDOR_LOGOS);
}

export interface FontOption {
  id: string;
  name: string;
  family: string;
  sample: string;
  category: 'sans-serif' | 'serif' | 'monospace';
}

export const AVAILABLE_FONTS: FontOption[] = [
  { id: 'system', name: 'System Default', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', sample: 'Modern & Clean', category: 'sans-serif' },
  { id: 'Outfit', name: 'Outfit', family: "'Outfit', sans-serif", sample: 'Ultra-Clean Display', category: 'sans-serif' },
  { id: 'Inter', name: 'Inter', family: "'Inter', sans-serif", sample: 'Crisp UI & Numbers', category: 'sans-serif' },
  { id: 'Roboto', name: 'Roboto', family: "'Roboto', sans-serif", sample: 'Classic Google Standard', category: 'sans-serif' },
  { id: 'Space Grotesk', name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", sample: 'Futuristic Geometric', category: 'sans-serif' },
  { id: 'Montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif", sample: 'Bold Clean Geometric', category: 'sans-serif' },
  { id: 'Playfair Display', name: 'Playfair Display', family: "'Playfair Display', serif", sample: 'Editorial Luxury Serif', category: 'serif' },
  { id: 'Cinzel', name: 'Cinzel', family: "'Cinzel', serif", sample: 'Classical Roman Inscription', category: 'serif' },
  { id: 'Lora', name: 'Lora', family: "'Lora', serif", sample: 'Warm Contemporary Serif', category: 'serif' },
  { id: 'JetBrains Mono', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", sample: 'Developer High-Tech', category: 'monospace' },
  { id: 'Fira Code', name: 'Fira Code', family: "'Fira Code', monospace", sample: 'Clean Monospace', category: 'monospace' },
  { id: 'Oswald', name: 'Oswald', family: "'Oswald', sans-serif", sample: 'Tall Impact Condensed', category: 'sans-serif' }
];

export function loadGoogleFont(fontIdOrName?: string): void {
  if (typeof document === 'undefined') return;
  if (!fontIdOrName || fontIdOrName === 'system' || fontIdOrName.startsWith('-apple-system')) return;
  
  const safeId = fontIdOrName.replace(/\s+/g, '-').toLowerCase();
  const linkId = `gfont-${safeId}`;
  if (document.getElementById(linkId)) return;
  
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontIdOrName)}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

export function getFontFamilyString(fontIdOrName?: string): string {
  if (!fontIdOrName || fontIdOrName === 'system') {
    return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }
  const match = AVAILABLE_FONTS.find(f => f.id === fontIdOrName || f.name.toLowerCase() === fontIdOrName.toLowerCase());
  return match ? match.family : `'${fontIdOrName}', sans-serif`;
}

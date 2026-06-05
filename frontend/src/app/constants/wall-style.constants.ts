export interface WallBgColor { label: string; value: string; dark: boolean; }
export interface WallFont    { label: string; value: string; }
export interface WallTextColor { label: string; value: string; }

export const WALL_BG_COLORS: WallBgColor[] = [
  // ── None ──
  { label: 'None (use image)', value: '',        dark: false },
  // ── Soft / light ──
  { label: 'White',            value: '#FFFFFF',  dark: false },
  { label: 'Ivory',            value: '#FAFAF0',  dark: false },
  { label: 'Blush Pink',       value: '#FFD6E0',  dark: false },
  { label: 'Peach',            value: '#FFD6BC',  dark: false },
  { label: 'Lemon',            value: '#FFF9C4',  dark: false },
  { label: 'Mint',             value: '#C8F5DC',  dark: false },
  { label: 'Sky Blue',         value: '#C8E6FF',  dark: false },
  { label: 'Lavender',         value: '#E8DCFF',  dark: false },
  { label: 'Rose',             value: '#FFB3C6',  dark: false },
  // ── Vivid ──
  { label: 'Red',              value: '#E53935',  dark: true  },
  { label: 'Coral',            value: '#FF5733',  dark: true  },
  { label: 'Orange',           value: '#F57C00',  dark: true  },
  { label: 'Amber',            value: '#FFC107',  dark: false },
  { label: 'Yellow Green',     value: '#C6E03A',  dark: false },
  { label: 'Green',            value: '#43A047',  dark: true  },
  { label: 'Teal',             value: '#00897B',  dark: true  },
  { label: 'Cyan',             value: '#00ACC1',  dark: true  },
  { label: 'Blue',             value: '#1E88E5',  dark: true  },
  { label: 'Indigo',           value: '#3949AB',  dark: true  },
  { label: 'Purple',           value: '#8E24AA',  dark: true  },
  { label: 'Hot Pink',         value: '#E91E8C',  dark: true  },
  // ── Dark / moody ──
  { label: 'Charcoal',         value: '#263238',  dark: true  },
  { label: 'Dark Navy',        value: '#1A2733',  dark: true  },
  { label: 'Midnight',         value: '#0F1A24',  dark: true  },
  { label: 'Deep Purple',      value: '#1A1A2E',  dark: true  },
  { label: 'Forest',           value: '#1B2D1B',  dark: true  },
  { label: 'Slate',            value: '#2C3E50',  dark: true  },
];

export const WALL_FONTS: WallFont[] = [
  { label: 'Default',         value: ''               },
  { label: 'Karla',           value: 'Karla'           },
  { label: 'Rasa',            value: 'Rasa'            },
  { label: 'Unbounded',       value: 'Unbounded'       },
  { label: 'Dancing Script',  value: 'Dancing Script'  },
  { label: 'Satisfy',         value: 'Satisfy'         },
  { label: 'Pacifico',        value: 'Pacifico'        },
  { label: 'Caveat',          value: 'Caveat'           },
  { label: 'Indie Flower',    value: 'Indie Flower'    },
  { label: 'Kaushan Script',  value: 'Kaushan Script'  },
];

export const WALL_TEXT_COLORS: WallTextColor[] = [
  { label: 'Default', value: ''        },
  { label: 'Dark',    value: '#142536' },
  { label: 'White',   value: '#FFFFFF' },
  { label: 'Cream',   value: '#F5ECD7' },
  { label: 'Teal',    value: '#10A7A4' },
  { label: 'Coral',   value: '#FF685C' },
];

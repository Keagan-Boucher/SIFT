/**
 * Curated starting points for //SOURCES. Hand-maintained: edit this list to
 * change what the PRESETS menu offers. Domains are stored bare, in the same
 * form addSource expects, so a preset stages exactly like a pasted URL.
 */
export interface PresetCategory {
  id: string;
  name: string;
  blurb: string;
  domains: string[];
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'tech',
    name: 'TECH',
    blurb: 'Components, peripherals and prebuilt machines.',
    domains: ['evetech.co.za', 'wootware.co.za', 'takealot.com', 'incredible.co.za'],
  },
  {
    id: 'trading-cards',
    name: 'TRADING CARDS',
    blurb: 'Singles, sealed product and accessories.',
    domains: ['dracoti.co.za', 'timewarp.co.za', 'battlewizards.co.za'],
  },
  {
    id: 'lifestyle',
    name: 'LIFESTYLE',
    blurb: 'Apparel, home and everyday goods.',
    domains: ['superbalist.com', 'takealot.com', 'makro.co.za'],
  },
];

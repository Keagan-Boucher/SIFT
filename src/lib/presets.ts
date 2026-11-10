/**
 * Curated bundles of sources. Hand-maintained: edit this list to change what
 * the presets screen offers. Domains are stored bare, in the same form
 * addSource expects. Keywords drive the category guess behind the suggested
 * sites on the new search screen.
 */
export interface PresetCategory {
  id: string;
  name: string;
  blurb: string;
  domains: string[];
  keywords: string[];
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'tech',
    name: 'Tech',
    blurb: 'Components, peripherals and prebuilt machines.',
    domains: ['evetech.co.za', 'takealot.com'],
    keywords: [
      'mouse', 'keyboard', 'monitor', 'gpu', 'graphics', 'cpu', 'ssd', 'hdd', 'ram', 'laptop', 'pc',
      'headphones', 'headset', 'earbuds', 'router', 'webcam', 'console', 'controller', 'charger',
      'power bank', 'tablet', 'phone', 'speaker', 'logitech', 'razer', 'samsung', 'sony', 'asus',
      'msi', 'corsair', 'nvidia', 'amd', 'intel', 'anker', 'apple', 'ipad', 'iphone', 'rtx',
    ],
  },
  {
    id: 'trading-cards',
    name: 'Trading cards',
    blurb: 'Singles, sealed product and accessories.',
    domains: ['geekhome.co.za', 'dragontown.co.za', 'bigbangshop.co.za', 'nexushub.co.za'],
    keywords: [
      'pokemon', 'magic', 'mtg', 'yugioh', 'yu-gi-oh', 'lorcana', 'booster', 'tcg', 'deck', 'sleeves',
      'binder', 'elite trainer', 'etb', 'commander', 'card',
    ],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    blurb: 'Apparel, home and everyday goods.',
    domains: ['takealot.com'],
    keywords: ['shirt', 'shoes', 'sneakers', 'jacket', 'kettle', 'toaster', 'towel', 'bedding', 'mug', 'bag', 'watch'],
  },
];

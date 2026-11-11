// The colours hosts can pick from in the outfits guide. The database stores
// only the short key ("marigold"), so the names and shades can be tuned here.

export type Colour = { key: string; name: string; hex: string };

export const PALETTE: Colour[] = [
  { key: 'yellow', name: 'Yellow', hex: '#F0C21B' },
  { key: 'marigold', name: 'Marigold', hex: '#E8920C' },
  { key: 'orange', name: 'Orange', hex: '#E0622A' },
  { key: 'peach', name: 'Peach', hex: '#F5BDA2' },
  { key: 'blush', name: 'Blush pink', hex: '#F3C6CF' },
  { key: 'pink', name: 'Pink', hex: '#E0679A' },
  { key: 'magenta', name: 'Magenta', hex: '#B5266E' },
  { key: 'red', name: 'Red', hex: '#B4262C' },
  { key: 'maroon', name: 'Maroon', hex: '#6D1F2C' },
  { key: 'purple', name: 'Purple', hex: '#6A3D9A' },
  { key: 'lavender', name: 'Lavender', hex: '#BBA9DC' },
  { key: 'navy', name: 'Navy', hex: '#1F2E57' },
  { key: 'blue', name: 'Blue', hex: '#3D6DB3' },
  { key: 'sky', name: 'Sky blue', hex: '#A9CCE8' },
  { key: 'teal', name: 'Teal', hex: '#1F7F7A' },
  { key: 'emerald', name: 'Emerald', hex: '#1E6B4A' },
  { key: 'sage', name: 'Sage', hex: '#9DB28A' },
  { key: 'mint', name: 'Mint', hex: '#BFE3D0' },
  { key: 'ivory', name: 'Ivory', hex: '#F4EEDD' },
  { key: 'white', name: 'White', hex: '#FFFFFF' },
  { key: 'gold', name: 'Gold', hex: '#C9A24B' },
  { key: 'silver', name: 'Silver', hex: '#BFC4C9' },
  { key: 'black', name: 'Black', hex: '#1E1E1E' },
];

const byKey = new Map(PALETTE.map((c) => [c.key, c]));

/** A colour by its key. A key this version of the app does not know still gets a readable name. */
export function colour(key: string): Colour {
  return byKey.get(key) ?? { key, name: key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '), hex: '#D9D4C4' };
}

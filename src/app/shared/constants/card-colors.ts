// Colors shared by the colored cards of the project
// (the teacher's "My classes" cards and the classes page cards).
//
//   main: the card color (background or header)
//   soft: a light version of the same color (light backgrounds)
//   dark: a dark version of the same color (text on light backgrounds)
export interface CardColor {
  main: string;
  soft: string;
  dark: string;
}


// Card colors (no navy). Each card takes the color at its position
// in the page, and the list cycles after the last color.
export const CARD_COLORS: CardColor[] = [
  { main: '#1D9E75', soft: '#E1F5EE', dark: '#085041' }, // teal
  { main: '#D85A30', soft: '#FAECE7', dark: '#712B13' }, // coral
  { main: '#7F77DD', soft: '#EEEDFE', dark: '#3C3489' }, // purple
  { main: '#D4537E', soft: '#FBEAF0', dark: '#72243E' }, // pink
  { main: '#BA7517', soft: '#FAEEDA', dark: '#633806' }, // amber
  { main: '#378ADD', soft: '#E6F1FB', dark: '#0C447C' }, // sky blue
  { main: '#5E9A2A', soft: '#EBF4E0', dark: '#2A4F0E' }, // green
  { main: '#9B59B6', soft: '#F4EAF8', dark: '#4F2463' }, // plum
  { main: '#1A9BB0', soft: '#E0F4F7', dark: '#0B5563' }, // turquoise
  { main: '#9A6B47', soft: '#F4ECE5', dark: '#4A321F' }, // brown
];


// Returns the color of the card at this position (cycles after the last one).
export function getCardColor(index: number): CardColor {
  return CARD_COLORS[index % CARD_COLORS.length];
}
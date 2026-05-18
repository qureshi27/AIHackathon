export const CLASSES = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'space', 'del', 'nothing',
] as const;

export type AslClass = typeof CLASSES[number];
export const NUM_CLASSES = CLASSES.length;
export const NOTHING_IDX = CLASSES.indexOf('nothing');

export function prettyLabel(c: string): string {
  if (c === 'space') return '␣ space';
  if (c === 'del') return '⌫ del';
  if (c === 'nothing') return '— nothing';
  return c;
}

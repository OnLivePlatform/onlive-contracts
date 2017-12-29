export const targetBlockTime = 15;

export function secondsToBlocks(seconds: number): number {
  return Math.ceil(seconds / targetBlockTime);
}

export function minutesToBlocks(minutes: number): number {
  return secondsToBlocks(minutes * 60);
}

export function hoursToBlocks(hours: number): number {
  return minutesToBlocks(hours * 60);
}

export function daysToBlocks(days: number): number {
  return hoursToBlocks(days * 24);
}

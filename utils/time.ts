export function toTimestamp(date: Date) {
  const timestamp = Math.round(date.getTime() / 1000);
  if (timestamp < 0) {
    // avoid uint overflow in Solidity contracts with negative numbers
    throw new Error('Dates before 1970 are not supported');
  }

  return timestamp;
}

export function getTimestamp() {
  return toTimestamp(new Date());
}

const MILLI = 1000n;

export function toMilliUnits(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * MILLI + BigInt(fraction.padEnd(3, '0'));
}

export function fromMilliUnits(value: bigint): string {
  const whole = value / MILLI;
  const fraction = (value % MILLI).toString().padStart(3, '0');
  return `${whole}.${fraction}`;
}

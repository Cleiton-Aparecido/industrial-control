const CENTS_PER_UNIT = 100n;
const MILLI_UNITS_PER_UNIT = 1000n;

export function toMinorUnits(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * CENTS_PER_UNIT + BigInt(fraction.padEnd(2, '0'));
}

export function fromMinorUnits(amount: bigint): string {
  const whole = amount / CENTS_PER_UNIT;
  const fraction = (amount % CENTS_PER_UNIT).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

export function multiplyPriceByMilliQuantity(
  priceInMinorUnits: bigint,
  quantityInMilliUnits: bigint,
): bigint {
  return (
    (priceInMinorUnits * quantityInMilliUnits + MILLI_UNITS_PER_UNIT / 2n) /
    MILLI_UNITS_PER_UNIT
  );
}

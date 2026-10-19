import {
  fromMinorUnits,
  multiplyPriceByMilliQuantity,
  toMinorUnits,
} from 'src/infra/money/money';

describe('money', () => {
  it('normalizes decimal values to minor units', () => {
    expect(fromMinorUnits(toMinorUnits('25.5'))).toBe('25.50');
  });

  it('rounds a line total with fractional quantity to cents', () => {
    const total = multiplyPriceByMilliQuantity(toMinorUnits('9.99'), 1500n);

    expect(fromMinorUnits(total)).toBe('14.99');
  });

  it('adds money values without floating point arithmetic', () => {
    const total = toMinorUnits('0.10') + toMinorUnits('0.20');

    expect(fromMinorUnits(total)).toBe('0.30');
  });
});

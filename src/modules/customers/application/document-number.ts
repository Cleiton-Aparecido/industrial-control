import { BadRequestException } from '@nestjs/common';

export function normalizeDocument(value: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException('Informe um CPF ou CNPJ');
  }
  return value.replace(/[^0-9a-z]/gi, '').toUpperCase();
}

function calculateCheckDigit(values: string, weights: number[]): number {
  const sum = [...values].reduce(
    (total, character, index) =>
      total + (character.charCodeAt(0) - 48) * weights[index],
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function identifyAndValidateDocument(value: string): 'CPF' | 'CNPJ' {
  const document = normalizeDocument(value);
  if (/^\d{11}$/.test(document) && !/^([0-9])\1+$/.test(document)) {
    const first = calculateCheckDigit(
      document.slice(0, 9),
      [10, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    const second = calculateCheckDigit(
      document.slice(0, 9) + first,
      [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    if (document.endsWith(`${first}${second}`)) return 'CPF';
  }

  if (
    /^[A-Z0-9]{12}\d{2}$/.test(document) &&
    !/^([A-Z0-9])\1+$/.test(document)
  ) {
    const first = calculateCheckDigit(
      document.slice(0, 12),
      [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    const second = calculateCheckDigit(
      document.slice(0, 12) + first,
      [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    if (document.endsWith(`${first}${second}`)) return 'CNPJ';
  }

  throw new BadRequestException('CPF ou CNPJ inválido');
}

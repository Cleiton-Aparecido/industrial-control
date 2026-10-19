import { BadRequestException } from '@nestjs/common';
import {
  identifyAndValidateDocument,
  normalizeDocument,
} from 'src/modules/customers/application/document-number';

describe('document-number', () => {
  it('normalizes and validates a CPF', () => {
    expect(normalizeDocument('529.982.247-25')).toBe('52998224725');
    expect(identifyAndValidateDocument('529.982.247-25')).toBe('CPF');
  });

  it('validates numeric and alphanumeric CNPJs', () => {
    expect(identifyAndValidateDocument('11.222.333/0001-81')).toBe('CNPJ');
    expect(identifyAndValidateDocument('A0000000000113')).toBe('CNPJ');
  });

  it('rejects invalid check digits and repeated digits', () => {
    expect(() => identifyAndValidateDocument('111.111.111-11')).toThrow(
      BadRequestException,
    );
    expect(() => identifyAndValidateDocument('529.982.247-24')).toThrow(
      BadRequestException,
    );
  });
});

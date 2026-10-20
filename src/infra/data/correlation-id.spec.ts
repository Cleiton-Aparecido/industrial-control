import {
  getCorrelationId,
  resolveCorrelationId,
  runWithCorrelationId,
} from './correlation-id';

describe('correlation-id', () => {
  const uuid = '3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b';

  it('mantém um UUID válido recebido', () => {
    expect(resolveCorrelationId(uuid)).toBe(uuid);
  });

  it('gera um UUID quando ausente', () => {
    expect(resolveCorrelationId(undefined)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('descarta valores inválidos ou maliciosos', () => {
    const generated = resolveCorrelationId('abc\r\nX-Injected: 1');
    expect(generated).not.toContain('abc');
    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveCorrelationId('x'.repeat(500))).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('isola o identificador por contexto assíncrono', async () => {
    const seen = await Promise.all(
      ['a', 'b'].map((id) =>
        runWithCorrelationId(id, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return getCorrelationId();
        }),
      ),
    );
    expect(seen).toEqual(['a', 'b']);
  });
});

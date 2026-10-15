export function isUniqueConstraintViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const databaseError = error as {
    code?: string;
    driverError?: { code?: string };
  };
  return (
    databaseError.code === '23505' ||
    databaseError.driverError?.code === '23505'
  );
}

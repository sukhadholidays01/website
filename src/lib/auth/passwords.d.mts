export function hashPassword(password: string): Promise<string>;
export function verifyPassword(password: string, encoded: unknown): Promise<boolean>;

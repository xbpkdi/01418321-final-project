import "server-only";
import {
  hashPasswordValue,
  verifyPasswordValue,
} from "@/lib/auth/password-core";

/** UC 1A: passwords are stored as a versioned scrypt encoding, never plaintext. */
export async function hashPassword(password: string): Promise<string> {
  return hashPasswordValue(password);
}

/** UC 1A: reject malformed encodings without leaking comparison timing. */
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  return verifyPasswordValue(password, encoded);
}

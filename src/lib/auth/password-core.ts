import {
  randomBytes,
  scrypt as nodeScrypt,
  type ScryptOptions,
  timingSafeEqual,
} from "node:crypto";
const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const PREFIX = "scrypt";

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPasswordValue(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
  });

  return [
    PREFIX,
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPasswordValue(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [prefix, costText, blockText, parallelText, saltText, keyText] =
    encoded.split("$");
  const cost = Number(costText);
  const blockSize = Number(blockText);
  const parallelization = Number(parallelText);

  if (
    prefix !== PREFIX ||
    cost !== COST ||
    blockSize !== BLOCK_SIZE ||
    parallelization !== PARALLELIZATION ||
    !saltText ||
    !keyText
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltText, "base64url");
    const storedKey = Buffer.from(keyText, "base64url");
    if (storedKey.length !== KEY_LENGTH) return false;

    const candidate = await deriveKey(password, salt, storedKey.length, {
      N: cost,
      r: blockSize,
      p: parallelization,
    });

    return timingSafeEqual(storedKey, candidate);
  } catch {
    return false;
  }
}

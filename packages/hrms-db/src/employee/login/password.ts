import { createCipheriv, createHash } from "node:crypto";

/** Same value as HRMS.Web `SecurityKey` in Web.config. */
const HRMS_SECURITY_KEY = "6C96C934-24C3-4A94-9BE6-93F9782FB8DB";

/** Operator reset password. Login compares the encoded form, not this string. */
export const DEFAULT_RESET_PASSWORD = "welcome123#";

const PASSWORD_STR_MAX_LENGTH = 200;

function sha1(data: Buffer): Buffer {
  return createHash("sha1").update(data).digest();
}

/**
 * .NET Framework PasswordDeriveBytes (SHA-1, 100 iterations).
 * GetBytes keeps leftover hash blocks, and the short-leftover copy uses the
 * V1 offset (buffer length minus the count already returned), not the count.
 */
class PasswordDeriveBytes {
  private readonly password: Buffer;
  private readonly salt: Buffer;
  private readonly iterations: number;
  private baseValue: Buffer | null = null;
  private prefix = 0;
  private extra: Buffer | null = null;
  private extraCount = 0;

  constructor(password: Buffer, salt: Buffer, iterations = 100) {
    this.password = password;
    this.salt = salt;
    this.iterations = iterations;
  }

  getBytes(count: number): Buffer {
    if (count < 1) {
      throw new Error("PasswordDeriveBytes count must be positive.");
    }
    const output = Buffer.alloc(count);
    let copied = 0;
    if (this.baseValue === null) {
      this.baseValue = this.computeBaseValue();
    } else if (this.extra !== null) {
      const available = this.extra.length - this.extraCount;
      if (available >= count) {
        this.extra.copy(output, 0, this.extraCount, this.extraCount + count);
        if (available > count) {
          this.extraCount += count;
        } else {
          this.extra = null;
        }
        return output;
      }
      this.extra.copy(output, 0, available, available + available);
      copied = available;
      this.extra = null;
    }

    const block = this.computeBytes(count - copied);
    block.copy(output, copied, 0, count - copied);
    if (block.length + copied > count) {
      this.extra = block;
      this.extraCount = count - copied;
    }
    return output;
  }

  private computeBaseValue(): Buffer {
    let value = sha1(Buffer.concat([this.password, this.salt]));
    for (let iteration = 1; iteration < this.iterations - 1; iteration += 1) {
      value = sha1(value);
    }
    return value;
  }

  private computeBytes(count: number): Buffer {
    const hashSize = 20;
    const block = Buffer.alloc(Math.ceil(count / hashSize) * hashSize);
    let offset = 0;
    const writeHash = (): void => {
      const hashed = sha1(Buffer.concat([this.hashPrefix(), this.baseValue!]));
      hashed.copy(block, offset);
      offset += hashSize;
    };
    writeHash();
    while (count > offset) {
      writeHash();
    }
    return block;
  }

  private hashPrefix(): Buffer {
    const prefix = this.prefix;
    this.prefix += 1;
    if (prefix > 999) {
      throw new Error("PasswordDeriveBytes requested too many bytes.");
    }
    if (prefix <= 0) {
      return Buffer.alloc(0);
    }
    const digits = Buffer.from("000", "ascii");
    let length = 0;
    if (prefix >= 100) {
      digits[0] = (digits[0] ?? 0) + Math.floor(prefix / 100);
      length += 1;
    }
    if (prefix >= 10) {
      digits[length] = (digits[length] ?? 0) + Math.floor((prefix % 100) / 10);
      length += 1;
    }
    digits[length] = (digits[length] ?? 0) + (prefix % 10);
    length += 1;
    return digits.subarray(0, length);
  }
}

/**
 * HRMS.Web login value: Base64(ASCII(Base64(Rijndael(UTF-16LE(password))))).
 * Matches EncryptionDecryption.Encrypt plus StringHelper.ConvertStrToBase64.
 */
export function encodeHrmsPassword(plainText: string): string {
  if (plainText.length === 0) {
    throw new Error("Password must not be empty.");
  }
  const derived = new PasswordDeriveBytes(
    Buffer.from(HRMS_SECURITY_KEY, "utf8"),
    Buffer.from(String(HRMS_SECURITY_KEY.length), "ascii"),
  );
  const key = derived.getBytes(32);
  const iv = derived.getBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plainText, "utf16le")),
    cipher.final(),
  ]);
  const encoded = Buffer.from(encrypted.toString("base64"), "ascii").toString(
    "base64",
  );
  if (encoded.length > PASSWORD_STR_MAX_LENGTH) {
    throw new Error("Encoded password exceeds TUsers.PasswordStr (varchar 200).");
  }
  return encoded;
}

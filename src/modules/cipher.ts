import crypto from "crypto";

export function encrypt(secret: string, data: string) {
  const key = Buffer.from(secret, "hex"); // 32 bytes
  const iv = crypto.randomBytes(16); // Random IV (16 bytes for AES-256-CBC)
  const cipher = (crypto as any).createCipheriv("aes-256-cbc", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);

  // Prepend IV to encrypted data
  return Buffer.concat([iv as any, encrypted]);
}

export function decrypt(secret: string, data: Buffer) {
  const key = Buffer.from(secret, "hex").subarray(0, 32);
  const iv = data.subarray(0, 16); // First 16 bytes is the IV
  const encryptedData = data.subarray(16); // Remaining bytes are the encrypted payload

  const decipher = (crypto as any).createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

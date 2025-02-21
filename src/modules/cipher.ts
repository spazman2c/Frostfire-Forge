import crypto from "crypto";
import log from "../modules/logger";

export let _privateKey = ''

export function decryptPrivateKey(encryptedKey: string, passphrase: string) {
  return crypto
    .createPrivateKey({
      key: encryptedKey,
      format: "pem",
      passphrase: passphrase,
    })
    .export({ type: "pkcs1", format: "pem" });
}

export function decryptRsa(
  encryptedMessage: Buffer,
  privateKeyPem: string
): string | null {
  try {
    // Ensure the encrypted message is a Buffer or Uint8Array
    if (!(encryptedMessage instanceof Buffer)) {
      encryptedMessage = Buffer.from(encryptedMessage);
    }

    // Decrypt the message using the RSA private key
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, // Make sure to use OAEP padding if you used RSA-OAEP for encryption
        oaepHash: "sha256", // Ensure the hash matches your encryption's hash algorithm
      },
      encryptedMessage as any
    );

    // Return the decrypted message as a string
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

export function generateKeyPair(passphrase: string | undefined): any {
  if (!passphrase) {
    log.error("No passphrase provided");
    return;
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      cipher: "aes-256-cbc",
      passphrase: passphrase,
    },
  });

  _privateKey = privateKey;

  return {
    publicKey,
    privateKey,
  };
}

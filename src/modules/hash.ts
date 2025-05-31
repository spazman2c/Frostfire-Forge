import crypto from "crypto";

export async function hash(password: string) {
  const result = await Bun.password.hash(password);
  return result;
}

export async function verify(password: string, hash: string) {
  const isValid = await Bun.password.verify(password, hash);
  return isValid;
}

export function getHash(password: string) {
  const hash = crypto.createHash("sha512").update(password).digest("hex");
  const numberValue = Object.assign([], Array.from(hash.replace(/[a-z]/g, "")));
  const sum = numberValue.reduce(
    (acc: number, curr: string, i: number) => acc + i,
    0
  );
  return [hash, numberValue, sum];
}

export function randomBytes(size: number) {
  return crypto.randomBytes(size).toString("hex");
}

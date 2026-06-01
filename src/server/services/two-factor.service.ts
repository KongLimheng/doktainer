import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { decrypt, encrypt } from "../lib/crypto";

export async function createTwoFactorSetup(input: {
  accountEmail: string;
  issuer: string;
}) {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: input.issuer,
    label: input.accountEmail,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 220,
  });

  return {
    secret,
    encryptedSecret: encrypt(secret),
    otpauthUrl,
    qrCodeDataUrl,
  };
}

export async function verifyTwoFactorToken(secret: string, token: string) {
  const result = await verify({
    token: token.replace(/\s+/g, ""),
    secret,
  });

  return result.valid;
}

export async function verifyEncryptedTwoFactorToken(
  encryptedSecret: string,
  token: string,
) {
  return verifyTwoFactorToken(decrypt(encryptedSecret), token);
}

export function revealManualEntryKey(encryptedSecret: string) {
  return decrypt(encryptedSecret);
}

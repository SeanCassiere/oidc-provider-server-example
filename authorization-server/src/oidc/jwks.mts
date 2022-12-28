import jose from "node-jose";

const keystore = jose.JWK.createKeyStore();

export async function getJwksKeystore() {
  return keystore;
}

export async function generateJwksKeys() {
  await keystore.generate("RSA", 2048);
}

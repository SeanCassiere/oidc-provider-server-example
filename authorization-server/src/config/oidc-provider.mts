import type { Configuration, JWK } from "oidc-provider";

import { env } from "./env.mjs";

import { PrismaAdapter } from "../oidc/Adapter.mjs";
import { findAccount } from "../oidc/findAccount.mjs";
import { generateJwksKeys, getJwksKeystore } from "../oidc/jwks.mjs";

export const OidcProviderConfiguration: () => Promise<Configuration> = async () => {
  await generateJwksKeys();
  const keystore = await getJwksKeystore();
  const jsonKeystore = keystore.toJSON(true) as { keys: JWK[] };

  const config: Configuration = {
    adapter: PrismaAdapter,
    clients: [
      {
        client_id: "foo",
        client_secret: "bar",
        redirect_uris: ["https://oidcdebugger.com/debug"],
        grant_types: ["implicit", "authorization_code"],
        response_types: ["code", "code id_token"],
        scope: "openid profile email",
        token_endpoint_auth_method: "client_secret_post",
      },
    ],
    jwks: jsonKeystore,
    cookies: {
      keys: [env.OIDC_COOKIE],
    },
    claims: {
      email: ["email", "email_verified"],
      profile: ["family_name", "given_name", "middle_name", "name", "preferred_username", "profile"],
    },
    features: {
      devInteractions: { enabled: true }, // change in prod
      deviceFlow: { enabled: true },
      revocation: { enabled: true },
      backchannelLogout: { enabled: true },
      clientCredentials: { enabled: true },
      userinfo: { enabled: true },
      jwtUserinfo: { enabled: true },
    },
    clientBasedCORS(ctx, origin, client) {
      return true;
    },
    pkce: {
      methods: ["S256", "plain"],
    },
    findAccount,
    ttl: {
      // Sessions
      Session: 1209600, // 14 days in seconds
      Interaction: 600, // 10 minutes
      DeviceCode: 600, // 10 minutes
      // Tokens
      AuthorizationCode: 60, //  1 minute
      IdToken: 3600, // 1 hour
      AccessToken: 86400, // 24 hours
    },
  };

  return config;
};

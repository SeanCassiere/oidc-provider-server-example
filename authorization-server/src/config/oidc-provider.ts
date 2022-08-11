import type { Configuration, JWK, Account } from "oidc-provider";
import { PrismaAdapter } from "../oidc/Adapter";

import { generateJwksKeys, getJwksKeystore } from "../oidc/jwks";
import { env } from "./env";

export const OidcProviderConfiguration: () => Promise<Configuration> = async () => {
  await generateJwksKeys();
  const keystore = await getJwksKeystore();
  const jsonKeystore = keystore.toJSON(true) as { keys: JWK[] };

  const config: Configuration = {
    adapter: PrismaAdapter,
    // clients: [
    //   {
    //     client_id: "foo",
    //     client_secret: "bar",
    //     redirect_uris: ["https://oidcdebugger.com/debug"],
    //   },
    // ],
    // clientDefaults: {
    //   response_types: ["code", "code id_token"],
    //   grant_types: ["authorization_code", "implicit", "refresh_token", "client_credentials"],
    // },
    clients: [],
    jwks: jsonKeystore,
    cookies: {
      keys: [env.OIDC_COOKIE],
    },
    routes: {
      authorization: "/auth",
      backchannel_authentication: "/backchannel",
      code_verification: "/device",
      device_authorization: "/device/auth",
      end_session: "/session/end",
      introspection: "/token/introspection",
      jwks: "/jwks",
      pushed_authorization_request: "/request",
      registration: "/register",
      revocation: "/token/revocation",
      token: "/token",
      userinfo: "/userinfo",
    },
    features: {
      devInteractions: { enabled: true }, // change in prod
      deviceFlow: { enabled: true },
      revocation: { enabled: true },
      backchannelLogout: { enabled: true, ack: "draft-07" },
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
    ttl: {
      AccessToken: function AccessTokenTTL(ctx, token, client) {
        if (token.resourceServer) {
          return token.resourceServer.accessTokenTTL || 60 * 60; // 1 hour in seconds
        }
        return 60 * 60; // 1 hour in seconds
      },
      AuthorizationCode: 600 /* 10 minutes in seconds */,
      BackchannelAuthenticationRequest: function BackchannelAuthenticationRequestTTL(ctx, request, client) {
        if (ctx && ctx.oidc && ctx.oidc?.params?.requested_expiry) {
          return Math.min(10 * 60, +(ctx?.oidc?.params?.requested_expiry as number)); // 10 minutes in seconds or requested_expiry, whichever is shorter
        }

        return 10 * 60; // 10 minutes in seconds
      },
      ClientCredentials: function ClientCredentialsTTL(ctx, token, client) {
        if (token.resourceServer) {
          return token.resourceServer.accessTokenTTL || 10 * 60; // 10 minutes in seconds
        }
        return 10 * 60; // 10 minutes in seconds
      },
      DeviceCode: 600 /* 10 minutes in seconds */,
      Grant: 1209600 /* 14 days in seconds */,
      IdToken: 3600 /* 1 hour in seconds */,
      Interaction: 3600 /* 1 hour in seconds */,
      RefreshToken: function RefreshTokenTTL(ctx, token, client) {
        if (
          ctx &&
          ctx.oidc.entities.RotatedRefreshToken &&
          client.applicationType === "web" &&
          client.tokenEndpointAuthMethod === "none" &&
          !token.isSenderConstrained()
        ) {
          // Non-Sender Constrained SPA RefreshTokens do not have infinite expiration through rotation
          return ctx.oidc.entities.RotatedRefreshToken.remainingTTL;
        }

        return 14 * 24 * 60 * 60; // 14 days in seconds
      },
      Session: 1209600 /* 14 days in seconds */,
    },
    findAccount: async (ctx, sub, token) => {
      const account: Account = {
        accountId: sub,
        claims: async (use, scope, claims, rejected) => {
          console.log("account", { use, scope, claims, rejected });
          return {
            sub,
            ...claims,
          };
        },
      };
      console.log("account", account);
      return account;
    },
  };

  return config;
};

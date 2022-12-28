import express from "express";
import expressLayouts from "express-ejs-layouts";
import Provider from "oidc-provider";
import { createServer } from "http";

import { env } from "./config/env.mjs";
import { OidcProviderConfiguration } from "./config/oidc-provider.mjs";

const app = express();
const server = createServer(app);

// app.use(expressLayouts);
// app.set("layout", "_layout");
// app.set("view engine", "ejs");

// app.use(express.static("public"));

const ISSUER = env.SERVER_HOST + ":" + env.PORT;

async function main() {
  const oidcConfiguration = await OidcProviderConfiguration();
  const oidc = new Provider(ISSUER, oidcConfiguration);

  app.get("/health", (_, res) => res.send({ status: "OK", uptime: process?.uptime() ?? -1 }));

  // app.use("/oidc", oidc.callback());
  app.use(oidc.callback());

  // app.use(express.json());
  // app.use(express.urlencoded({ extended: true }));

  server.listen(env.PORT, () => {
    console.log(`🚀 app is running at ${ISSUER} in the ${env.NODE_ENV} environment`);
    console.log(`Check ${ISSUER}/.well-known/openid-configuration`);
  });
}

main().catch((err) => {
  if (server.listening) server.close();

  console.error(err);
  process.exitCode = 1;
});

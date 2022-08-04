import express from "express";
import { createServer } from "http";
import { Provider } from "oidc-provider";

import { env } from "./config/env";
import { OidcProviderConfiguration } from "./config/oidc-provider";

const app = express();
const server = createServer(app);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ISSUER = env.SERVER_HOST + ":" + env.PORT;

async function main() {
  const oidc = new Provider(ISSUER, OidcProviderConfiguration);

  app.use(oidc.callback());

  app.get("/health", (_, res) => res.send({ status: "OK", uptime: process.uptime() }));

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

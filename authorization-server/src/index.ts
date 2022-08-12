import express from "express";
import expressLayouts from "express-ejs-layouts";
import { createServer } from "http";
import { Provider } from "oidc-provider";

import { env } from "./config/env";
import { OidcProviderConfiguration } from "./config/oidc-provider";
import { oidcRoutes } from "./oidc/oidcRoutes";

const app = express();
const server = createServer(app);

app.use(expressLayouts);
app.set("layout", "_layout");
app.set("view engine", "ejs");

app.use(express.static("public"));

const ISSUER = env.SERVER_HOST + ":" + env.PORT;

async function main() {
  const oidcConfiguration = await OidcProviderConfiguration();
  const oidc = new Provider(ISSUER, oidcConfiguration);

  app.use("/oidc", oidc.callback());

  oidcRoutes(app, oidc);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_, res) => res.send({ status: "OK", uptime: process.uptime() }));

  server.listen(env.PORT, () => {
    console.log(`🚀 app is running at ${ISSUER} in the ${env.NODE_ENV} environment`);
    console.log(`Check ${ISSUER}/oidc/.well-known/openid-configuration`);
  });
}

main().catch((err) => {
  if (server.listening) server.close();

  console.error(err);
  process.exitCode = 1;
});

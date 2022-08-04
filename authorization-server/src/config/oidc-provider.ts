import { Configuration } from "oidc-provider";

export const OidcProviderConfiguration: Configuration = {
  clients: [
    {
      client_id: "foo",
      client_secret: "bar",
      redirect_uris: ["http://lvh.me:8080/cb"],
    },
  ],
};

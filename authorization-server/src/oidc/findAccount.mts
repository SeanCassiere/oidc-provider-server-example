import { type ClaimsParameterMember, type KoaContextWithOIDC } from "oidc-provider";

export function findAccount(ctx: KoaContextWithOIDC, sub: string, token?: any) {
  console.log("findAccount called, sub: ", sub);
  const account = { email: "a@a.com", email_verified: true };
  return {
    accountId: sub,
    claims: async (
      use: string,
      scope: string,
      claims: { [key: string]: null | ClaimsParameterMember },
      rejected: string[]
    ) => {
      console.log(
        "----\n\nclaims async called \nuse: ",
        use,
        "\nscope: ",
        scope,
        "\nclaims: ",
        claims,
        "\nrejected: ",
        rejected,
        "\n\n----"
      );
      return {
        sub,
        email: account.email,
        email_verified: account.email_verified,
      };
    },
  };
}

import type { AccountClaims, ClaimsParameterMember, KoaContextWithOIDC } from "oidc-provider";
const store = new Map();
const logins = new Map();

function randomId() {
  return Math.random().toString(36).substring(2);
}

type MyAccountClaims = { [key: string]: null | ClaimsParameterMember };

const profileDetails = {
  email: "johndoe@example.com",
  email_verified: false,
  family_name: "Doe",
  gender: "male",
  given_name: "John",
  middle_name: "Middle",
  name: "John Doe",
  preferred_username: "johnny",
  updated_at: 1454704946,
};

export class Account {
  accountId;
  profile;

  constructor(id: string, profile: any) {
    this.accountId = id || randomId();
    this.profile = profile;
  }

  async claims(use: string, scope: string, claims: MyAccountClaims, rejected: string[]): Promise<AccountClaims> {
    // eslint-disable-line no-unused-vars
    if (this.profile) {
      return {
        sub: this.accountId, // it is essential to always return a sub claim

        email: this.profile.email,
        email_verified: this.profile.email_verified,
        name: this.profile.name,
        given_name: this.profile.given_name,
        family_name: this.profile.family_name,
        middle_name: this.profile.middle_name,
      };
    }

    return {
      sub: this.accountId, // it is essential to always return a sub claim

      ...profileDetails,
    };
  }

  static async findByFederated(provider: string, claims: MyAccountClaims) {
    const id = `${provider}.${claims.sub}`;
    if (!logins.get(id)) {
      logins.set(id, new Account(id, claims));
    }
    return logins.get(id);
  }

  static async findByLogin(ctx: KoaContextWithOIDC, sub: string) {
    if (!logins.get(ctx)) {
      logins.set(ctx, new Account(sub, profileDetails));
    }

    return logins.get(ctx);
  }
}

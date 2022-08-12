import type { Adapter, AdapterPayload } from "oidc-provider";
import type { Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

export class PrismaAdapter implements Adapter {
  name: string;
  /**
   *
   * Creates an instance of MyAdapter for an oidc-provider model.
   *
   * @constructor
   * @param name Name of the oidc-provider model. One of "Grant, "Session", "AccessToken",
   * "AuthorizationCode", "RefreshToken", "ClientCredentials", "Client", "InitialAccessToken",
   * "RegistrationAccessToken", "DeviceCode", "Interaction", "ReplayDetection",
   * "BackchannelAuthenticationRequest", or "PushedAuthorizationRequest"
   *
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   *
   * Update or Create an instance of an oidc-provider model.
   *
   * @return Promise fulfilled when the operation succeeded. Rejected with error when
   * encountered.
   * @param id Identifier that oidc-provider will use to reference this model instance for
   * future operations.
   * @param payload Object with all properties intended for storage.
   * @param expiresIn Number of seconds intended for this model to be stored.
   *
   */
  async upsert(id: string, payload: AdapterPayload, expiresIn: number) {
    /**
     *
     * When this is one of AccessToken, AuthorizationCode, RefreshToken, ClientCredentials,
     * InitialAccessToken, RegistrationAccessToken or DeviceCode.
     */
    // const dataBlob = payload as unknown as Prisma.JsonObject;
    // const record = {
    //   model_metadata: dataBlob,
    //   model_type: this.name,
    //   oidc_id: id,
    //   grant_id: payload.grantId,
    //   user_code: payload.userCode,
    //   u_id: payload.uid,
    //   //
    //   client_id: payload.clientId,
    //   account_id: payload.accountId,
    // };

    // console.log(this.name, id, "upsert");
    // await prisma.oidcModel.upsert({
    //   where: {
    //     oidc_id: id,
    //   },
    //   update: {
    //     ...record,
    //   },
    //   create: {
    //     ...record,
    //   },
    // });
    // console.log(this.name, id, "upsert worked!");

    // console.log(this.name, id, "upsert");
    const findRecord = await prisma.oidcModel.findFirst({ where: { oidc_id: id } });
    const dataBlob = payload as unknown as Prisma.JsonObject;
    let record = {
      model_metadata: dataBlob,
      model_type: this.name,
      oidc_id: id,
      grant_id: payload.grantId,
      user_code: payload.userCode,
      u_id: payload.uid,
      //
      client_id: payload.clientId,
      account_id: payload.accountId,
    };
    if (findRecord) {
      record.model_metadata = { ...record.model_metadata, ...(findRecord.model_metadata as any) };
    }

    await prisma.oidcModel.upsert({
      where: {
        oidc_id: id,
      },
      update: {
        ...record,
      },
      create: {
        ...record,
      },
    });
    // console.log(this.name, id, "upsert worked!");
  }

  /**
   *
   * Return previously stored instance of an oidc-provider model.
   *
   * @return Promise fulfilled with what was previously stored for the id (when found and
   * not dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
   * when encountered.
   * @param id Identifier of oidc-provider model
   *
   */
  async find(id: string) {
    let record;
    // console.log(this.name, id, "called find");
    if (this.name === "Client") {
      record = {
        oidc_id: id,
        model_metadata: {
          client_name: "Foo Bar",
          client_id: id,
          client_secret: "bar",
          redirect_uris: ["https://oidcdebugger.com/debug", "https://openidconnect.net/callback"],
          response_types: [
            "code",
            // "code id_token"
          ],
          grant_types: [
            "authorization_code",
            "refresh_token",
            //  "implicit",
            // "client_credentials",
          ],
          scopes: ["openid"],
        },
        consumed: false,
      };
    } else {
      record = await prisma.oidcModel.findFirst({
        where: {
          oidc_id: {
            equals: id,
          },
        },
      });
    }

    if (!record) return;
    const payload = record.model_metadata as AdapterPayload;
    const returnPayload = { id: record.oidc_id, ...payload, consumed: record.consumed ? true : false };
    // console.log(this.name, id, "find worked!", returnPayload);
    return returnPayload;
  }

  /**
   *
   * Return previously stored instance of DeviceCode by the end-user entered user code. You only
   * need this method for the deviceFlow feature
   *
   * @return Promise fulfilled with the stored device code object (when found and not
   * dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
   * when encountered.
   * @param userCode the user_code value associated with a DeviceCode instance
   *
   */
  async findByUserCode(userCode: string) {
    const record = await prisma.oidcModel.findFirst({
      where: {
        user_code: {
          equals: userCode,
        },
      },
    });

    if (!record) return;
    const payload = record.model_metadata as AdapterPayload;

    return { id: record.oidc_id, ...payload };
  }

  /**
   *
   * Return previously stored instance of Session by its uid reference property.
   *
   * @return Promise fulfilled with the stored session object (when found and not
   * dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
   * when encountered.
   * @param uId the unique id value associated with a Session instance
   *
   */
  async findByUid(uId: string) {
    console.log(this.name, uId, "called findByUid");
    const record = await prisma.oidcModel.findFirst({
      where: {
        u_id: {
          equals: uId,
        },
      },
    });

    if (!record) return;
    const payload = record.model_metadata as AdapterPayload;
    // console.log(this.name, uId, "findByUid worked!");
    return { id: record.oidc_id, ...payload };
  }

  /**
   *
   * Mark a stored oidc-provider model as consumed (not yet expired though!). Future finds for this
   * id should be fulfilled with an object containing additional property named "consumed" with a
   * truthy value (timestamp, date, boolean, etc).
   *
   * @return Promise fulfilled when the operation succeeded. Rejected with error when
   * encountered.
   * @param id Identifier of oidc-provider model
   *
   */
  async consume(id: string) {
    console.log(this.name, id, "called consume");
    await prisma.oidcModel.updateMany({
      where: {
        oidc_id: { equals: id },
      },
      data: {
        consumed: true,
        consumedAt: new Date(),
      },
    });
  }

  /**
   *
   * Destroy/Drop/Remove a stored oidc-provider model. Future finds for this id should be fulfilled
   * with falsy values.
   *
   * @return Promise fulfilled when the operation succeeded. Rejected with error when
   * encountered.
   * @param id Identifier of oidc-provider model
   *
   */
  async destroy(id: string) {
    console.log(this.name, id, "called destroy");
    await prisma.oidcModel.deleteMany({ where: { oidc_id: { equals: id } } });
  }

  /**
   *
   * Destroy/Drop/Remove a stored oidc-provider model by its grantId property reference. Future
   * finds for all tokens having this grantId value should be fulfilled with falsy values.
   *
   * @return Promise fulfilled when the operation succeeded. Rejected with error when
   * encountered.
   * @param grantId the grantId value associated with a this model's instance
   *
   */
  async revokeByGrantId(grantId: string) {
    console.log(this.name, grantId, "called revokeByGrantId");
    await prisma.oidcModel.deleteMany({ where: { grant_id: { equals: grantId } } });
  }
}

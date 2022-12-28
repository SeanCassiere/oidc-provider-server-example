// https://github.com/panva/node-oidc-provider/blob/main/example/adapters/contributed/prisma.ts
import { OidcModel, Prisma } from "@prisma/client";
import { Adapter, AdapterPayload } from "oidc-provider";

import { prisma } from "../config/prisma.mjs";

const types = [
  "OidcModels",
  "AccessToken",
  "AuthorizationCode",
  "RefreshToken",
  "DeviceCode",
  "ClientCredentials",
  "Client",
  "InitialAccessToken",
  "RegistrationAccessToken",
  "Interaction",
  "ReplayDetection",
  "PushedAuthorizationRequest",
  "Grant",
  "BackchannelAuthenticationRequest",
].reduce((map, name) => ({ ...map, [name]: name }), {} as Record<string, string>);

function prepare(doc: OidcModel) {
  const isPayloadJson = doc.payload && typeof doc.payload === "object" && !Array.isArray(doc.payload);

  const payload = isPayloadJson ? (doc.payload as Prisma.JsonObject) : {};

  return {
    ...payload,
    ...(doc.consumedAt ? { consumed: true } : undefined),
  };
}

function expiresAt(expiresIn?: number) {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
}

export class PrismaAdapter implements Adapter {
  type: string;

  constructor(name: string) {
    this.type = types[name];
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn?: number): Promise<void> {
    const data = {
      type: this.type,
      payload: payload as Prisma.JsonObject,
      grantId: payload.grantId,
      userCode: payload.userCode,
      uid: payload.uid,
      expiresAt: expiresAt(expiresIn),
    };

    await prisma.oidcModel.upsert({
      where: { id_type: { id, type: this.type } },
      update: {
        ...data,
      },
      create: {
        id,
        ...data,
      },
    });
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    const doc = await prisma.oidcModel.findUnique({
      where: {
        id_type: {
          id,
          type: this.type,
        },
      },
    });

    if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) {
      return undefined;
    }

    return prepare(doc);
  }

  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    const doc = await prisma.oidcModel.findFirst({
      where: {
        userCode,
      },
    });

    if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) {
      return undefined;
    }

    return prepare(doc);
  }

  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    const doc = await prisma.oidcModel.findUnique({
      where: {
        uid,
      },
    });

    if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) {
      return undefined;
    }

    return prepare(doc);
  }

  async consume(id: string): Promise<void> {
    await prisma.oidcModel.update({
      where: {
        id_type: {
          id,
          type: this.type,
        },
      },
      data: {
        consumedAt: new Date(),
      },
    });
  }

  async destroy(id: string): Promise<void> {
    await prisma.oidcModel.delete({
      where: {
        id_type: {
          id,
          type: this.type,
        },
      },
    });
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    await prisma.oidcModel.deleteMany({
      where: {
        grantId,
      },
    });
  }
}

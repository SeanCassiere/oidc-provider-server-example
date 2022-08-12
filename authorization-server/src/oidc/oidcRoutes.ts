import type { Application, Request, Response, NextFunction } from "express";
import type { Provider, InteractionResults } from "oidc-provider";
import { urlencoded } from "express";
import { inspect } from "util";
import querystring from "querystring";

import { Account } from "./Account";

const body = urlencoded({ extended: false });

const keys = new Set();
const debug = (obj: Object) =>
  querystring.stringify(
    Object.entries(obj).reduce((acc, [key, value]) => {
      keys.add(key);
      if (!key) return acc;
      acc[key] = inspect(value, { depth: null });
      return acc;
    }, {} as any),
    "<br />",
    ": ",
    {
      encodeURIComponent(value) {
        return keys.has(value) ? `<strong>${value}</strong>` : value;
      },
    }
  );

export function oidcRoutes(app: Application, provider: Provider) {
  const {
    constructor: {
      errors: { SessionNotFound },
    },
  } = provider as unknown as any;

  function setNoCache(req: Request, res: Response, next: NextFunction) {
    res.set("cache-control", "no-store");
    next();
  }

  app.use((req, res, next) => {
    const orig = res.render;
    // you'll probably want to use a full blown render engine capable of layouts
    // res.render = (view, locals) => {
    //   app.render(view, locals, (err, html) => {
    //     if (err) throw err;
    //     orig.call(res, "_layout", {
    //       ...locals,
    //       body: html,
    //     } as any);
    //   });
    // };
    next();
  });

  app.get("/interaction/:uid", setNoCache, async (req, res, next) => {
    try {
      const { uid, prompt, params, session } = await provider.interactionDetails(req, res);

      const client = await provider.Client.find(params.client_id as string);

      switch (prompt.name) {
        case "login": {
          return res.render("login", {
            client,
            uid,
            details: prompt.details,
            params,
            title: "Sign-in",
            session: session ? debug(session) : undefined,
            dbg: {
              params: debug(params),
              prompt: debug(prompt),
            },
          });
        }
        case "consent": {
          return res.render("interaction", {
            client,
            uid,
            details: prompt.details,
            params,
            title: "Authorize",
            session: session ? debug(session) : undefined,
            dbg: {
              params: debug(params),
              prompt: debug(prompt),
            },
          });
        }
        default:
          return undefined;
      }
    } catch (err) {
      return next(err);
    }
  });

  app.post("/interaction/:uid/login", setNoCache, body, async (req, res, next) => {
    try {
      const {
        prompt: { name },
        session,
      } = await provider.interactionDetails(req, res);

      const acr = session?.acr;
      const email = req.body.email;
      const password = req.body.password;
      const account = await Account.findByLogin({ req } as any, email);

      console.log({ email, password });
      console.log({ account });

      const result: InteractionResults = {
        login: {
          accountId: account.accountId,
          acr,
          remember: false,
        },
      };

      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.post("/interaction/:uid/confirm", setNoCache, body, async (req, res, next) => {
    try {
      const interactionDetails = await provider.interactionDetails(req, res);
      const {
        prompt: { name, details },
        params,
      } = interactionDetails;
      const session = interactionDetails.session;
      const accountId = session?.accountId ?? "";

      let { grantId } = interactionDetails;
      let grant;

      if (grantId) {
        // we'll be modifying existing grant in existing session
        grant = await provider.Grant.find(grantId);
      } else {
        // we're establishing a new grant
        grant = new provider.Grant({
          accountId,
          clientId: params.client_id as string | undefined,
        });
      }

      if (details.missingOIDCScope) {
        grant?.addOIDCScope((details as any)?.missingOIDCScope.join(" ") as any);
      }
      if (details.missingOIDCClaims) {
        grant?.addOIDCClaims(details?.missingOIDCClaims as any);
      }
      if (details.missingResourceScopes) {
        // eslint-disable-next-line no-restricted-syntax
        for (const [indicator, scopes] of Object.entries(details?.missingResourceScopes as any)) {
          grant?.addResourceScope(indicator, (scopes as string[]).join(" "));
        }
      }

      grantId = await grant?.save();

      const consent = {};
      if (!interactionDetails.grantId) {
        // we don't have to pass grantId to consent, we're just modifying existing one
        (consent as any).grantId = grantId;
      }

      const result = { consent };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
    } catch (err) {
      next(err);
    }
  });

  app.get("/interaction/:uid/abort", setNoCache, async (req, res, next) => {
    try {
      const result = {
        error: "access_denied",
        error_description: "End-User aborted interaction",
      };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SessionNotFound) {
      // handle interaction expired / session not found error
    }
    next(err);
  });
}

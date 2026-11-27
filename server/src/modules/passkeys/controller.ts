import { Router } from 'express';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import type { Dependencies } from '../../deps.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/errors.js';
import {
  passkeyAuthenticationSchema,
  passkeyEmailSchema,
  registrationResponseSchema,
} from '../../validation.js';
import {
  beginAuthentication,
  beginRegistration,
  completeAuthentication,
  completeRegistration,
  listPasskeys,
  removePasskey,
} from './service.js';
import { pathParam } from '../../utils/params.js';

export function createPasskeysRouter(deps: Dependencies): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({ passkeys: await listPasskeys(deps, currentUser(req)) });
    }),
  );

  router.post(
    '/register/options',
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json(await beginRegistration(deps, currentUser(req)));
    }),
  );

  router.post(
    '/register/verify',
    requireAuth,
    validate(registrationResponseSchema),
    asyncHandler(async (req, res) => {
      const response = res.locals.validatedBody as unknown as RegistrationResponseJSON;
      res.json(await completeRegistration(deps, currentUser(req), response));
    }),
  );

  router.post(
    '/authenticate/options',
    validate(passkeyEmailSchema),
    asyncHandler(async (req, res) => {
      const { email } = res.locals.validatedBody as { email?: string };
      res.json(await beginAuthentication(deps, email));
    }),
  );

  router.post(
    '/authenticate/verify',
    validate(passkeyAuthenticationSchema),
    asyncHandler(async (req, res) => {
      const { email, response } = res.locals.validatedBody as unknown as {
        email?: string;
        response: AuthenticationResponseJSON;
      };
      const user = await completeAuthentication(deps, email, response, res);
      res.json({ user });
    }),
  );

  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      await removePasskey(deps, currentUser(req), pathParam(req, 'id'));
      res.status(204).end();
    }),
  );

  return router;
}

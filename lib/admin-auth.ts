import 'server-only';

import { NextRequest } from 'next/server';
import { getEnv } from '@/lib/env';

export function isAdminAuthorized(req: NextRequest) {
  const adminToken = getEnv().adminToken;
  const requestToken = req.headers.get('x-admin-token');

  return Boolean(adminToken) && requestToken === adminToken;
}

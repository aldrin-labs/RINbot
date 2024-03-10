import { VercelRequest, VercelResponse } from '@vercel/node';
import UpdatePoolProviderCaches from "../cronjobs/update-pool-provider-caches"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req && req.headers !== undefined && req.headers["Authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    console.debug("req.headers.Authorization", req.headers["Authorization"])
    return res.status(401).end('Unauthorized');
  }

  try {
    await UpdatePoolProviderCaches();

  } catch (e) {
    console.error(`[updateProviderCaches.cronjob.handler] error`, e);
  }
}

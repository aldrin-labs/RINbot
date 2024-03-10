import { VercelRequest, VercelResponse } from '@vercel/node';
import UpdatePoolProviderCaches from "../cronjobs/update-pool-provider-caches"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req && req.headers !== undefined && req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  try {
    await UpdatePoolProviderCaches();
    return res.status(200).end()

  } catch (e) {
    console.error(`[updateProviderCaches.cronjob.handler] error`, e);
    return res.status(500).end()
  }
}

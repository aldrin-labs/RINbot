import { VercelRequest, VercelResponse } from '@vercel/node';
import coinWhitelist from '../src/storage/coin-whitelist';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.status(200).json(coinWhitelist);
  } catch (error) {
    console.error(`[coin-whitelist.handler] error`, error);
    return res.status(500).end();
  }
}

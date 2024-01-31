import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handle(req: VercelRequest, res: VercelResponse) {
  try {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Serverless Function is running</h1>');
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Server Error</h1><p>Sorry, there was a problem</p>');
    console.error(e.message);
  }
}
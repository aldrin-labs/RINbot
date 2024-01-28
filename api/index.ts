import { VercelRequest, VercelResponse } from '@vercel/node';
import { startVercel } from '../src/index';
import { webhookCallback } from "grammy";
import { bot } from '../src/index'
import { production } from '../src/core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await production(req, res, bot)
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Server Error</h1><p>Sorry, there was a problem</p>');
    console.error(e.message);
  }
}

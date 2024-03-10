import { VercelRequest, VercelResponse } from '@vercel/node';
import axios, { AxiosResponse } from 'axios'
import { BOT_TOKEN, VERCEL_URL } from '../src/config/bot.config';

const setWebhook = async () => {
  let response: AxiosResponse = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
  if(response.data['result']['url'] === ''){
    response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${VERCEL_URL}/api/webhook&max_connections=100`)
    console.debug(response.data['ok']);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.debug("setWebhook")
    await setWebhook()
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Serverless function is running</h1>');
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Server Error</h1><p>Sorry, there was a problem</p>');
    console.error(e.message);
  }
}
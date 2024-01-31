import { VercelRequest, VercelResponse } from '@vercel/node';
import { startVercel, bot } from '../src';
import { webhookCallback } from 'grammy';

export default webhookCallback(bot, "http");
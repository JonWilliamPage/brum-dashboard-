import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { prompt, mode } = await req.json() as { prompt: string; mode?: 'briefing' | 'ask' };

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    const model = mode === 'briefing' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';
    const message = await client.messages.create({
      model,
      max_tokens: mode === 'briefing' ? 1500 : 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return Response.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    return Response.json({ content: content.text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: msg }, { status: 500 });
  }
}

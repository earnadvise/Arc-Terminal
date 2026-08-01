import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured in backend.' },
        { status: 500 }
      );
    }

    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      system: 'You are the Arc AI Agent, an autonomous trading assistant powered by Circle Agent Stack. You can check balances and execute swaps.',
      messages,
    });

    return NextResponse.json({
      role: 'assistant',
      content: text,
    });
  } catch (error: any) {
    console.error('Agent API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

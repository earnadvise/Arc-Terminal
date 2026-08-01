import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured in backend.' },
        { status: 500 }
      );
    }

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
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

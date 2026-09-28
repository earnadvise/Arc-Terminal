import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    // Call the Arc/Circle API to generate a session token for the Onramp Kit
    // using the LIVE_API_KEY stored in environment variables.
    const response = await fetch('https://api.circle.com/v1/onramp/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ARC_API_KEY}`
      },
      body: JSON.stringify({
        destinationAddress: address,
        // Add any other required parameters for your specific onramp setup
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: 'Failed to create session', details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ session: data.data.sessionToken });

  } catch (error) {
    console.error('Onramp session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

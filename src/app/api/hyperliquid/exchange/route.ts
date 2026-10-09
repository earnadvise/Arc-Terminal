import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Simulate Hyperliquid Backend Relayer
    
    if (body.action?.type === 'approveAgent') {
      console.log('Backend Relayer: Intercepted approveAgent payload', body);
      // Return a mocked success response
      return NextResponse.json({
        status: 'ok',
        response: {
          type: 'default',
          data: {
            statuses: [
              {
                agentAddress: body.action.agentAddress,
                status: 'approved'
              }
            ]
          }
        }
      });
    }

    if (body.action?.type === 'order') {
      console.log('Backend Relayer: Intercepted placeOrder payload', body);
      // Return a mocked filled order response
      return NextResponse.json({
        status: 'ok',
        response: {
          type: 'order',
          data: {
            statuses: [
              {
                filled: {
                  totalSz: body.action.orders[0].sz,
                  avgPx: body.action.orders[0].limitPx,
                  oid: Math.floor(Math.random() * 10000000)
                }
              }
            ]
          }
        }
      });
    }

    // Default mock response for other actions
    return NextResponse.json({
      status: 'ok',
      response: {
        type: 'default',
        data: { statuses: ['success'] }
      }
    });

  } catch (error) {
    return NextResponse.json({ status: 'err', response: 'Internal Relayer Error' }, { status: 500 });
  }
}

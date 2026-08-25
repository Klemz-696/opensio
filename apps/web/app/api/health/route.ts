import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    app: '@opensio/web',
    timestamp: new Date().toISOString(),
  });
}

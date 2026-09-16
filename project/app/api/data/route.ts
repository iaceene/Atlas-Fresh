import { NextResponse } from 'next/server';
import { getAtlasContext } from '@/utils/atlas-context';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const contextId = url.searchParams.get('contextId');
    const context = await getAtlasContext(contextId);

    return NextResponse.json({
      success: true,
      plan: context.plan,
      contextId: context.contextId,
      source: context.source,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message || 'Parsing failed' },
      { status: 500 }
    );
  }
}


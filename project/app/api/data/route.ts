import { NextResponse } from 'next/server';
import path from 'path';
import { parseAtlasWorkbook } from '@/utils/parser/parser';
import { createEngine } from '@/utils/engine/engine';

function createPlan(filePath: string) {
  const data = parseAtlasWorkbook(filePath);
  return createEngine(data).plan();
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'Atlas_Fresh_Production_Commercial_Data.xlsx');
    return NextResponse.json({ success: true, plan: createPlan(filePath) });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}


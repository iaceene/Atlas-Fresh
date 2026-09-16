import { NextResponse } from 'next/server';
import { createUploadSource, storeAtlasContextFromBuffer } from '@/utils/atlas-context';

const MAX_XLSX_BYTES = 25 * 1024 * 1024;

function isSupportedWorkbook(file: File) {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return (
    name.endsWith('.xlsx') ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/octet-stream'
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Please upload an .xlsx file.' },
        { status: 400 }
      );
    }

    if (!isSupportedWorkbook(file)) {
      return NextResponse.json(
        { success: false, error: 'Only .xlsx workbooks are supported.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_XLSX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'The uploaded workbook is too large.' },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const context = storeAtlasContextFromBuffer(buffer, createUploadSource(file.name));

    return NextResponse.json({
      success: true,
      plan: context.plan,
      contextId: context.contextId,
      source: context.source,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: message || 'Failed to parse the uploaded workbook.',
      },
      { status: 400 }
    );
  }
}

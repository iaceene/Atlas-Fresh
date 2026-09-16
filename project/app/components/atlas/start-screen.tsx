'use client';

import React, { useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { UploadCloud, Loader2, PlayCircle, FileSpreadsheet, ShieldAlert } from 'lucide-react';

interface StartScreenProps {
  onContinue: () => void;
  onUploadFile: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string | null;
}

export function StartScreen({
  onContinue,
  onUploadFile,
  isUploading = false,
  uploadProgress = 0,
  error = null,
}: StartScreenProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center py-10">
      <Card className="w-full max-w-3xl border-slate-200 shadow-sm bg-white/90 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-100">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Workbook-driven planning
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Upload a fresh .xlsx workbook or continue with the preloaded data
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl">
                The workbook is parsed on the server, passed through the planning engine, and used as the AI context.
                You can also load the bundled sample workbook immediately.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              type="button"
              size="lg"
              className="h-12 justify-start gap-3 bg-emerald-700 text-white hover:bg-emerald-800"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              <span>Upload .xlsx to server</span>
            </Button>

            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 justify-start gap-3"
              onClick={onContinue}
              disabled={isUploading}
            >
              <PlayCircle className="h-4 w-4 text-emerald-700" />
              <span>Continue with preloaded data</span>
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onUploadFile(file);
              event.target.value = '';
            }}
          />

          {isUploading && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Uploading and parsing workbook…</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} max={100} indicatorClassName="bg-emerald-600" />
              <p className="text-xs text-slate-500">
                The server is validating the workbook, running the allocation engine, and preparing a new AI context.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-3 items-start">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-xs text-rose-700 mt-1">
                  Fix the workbook and try again, or continue with the preloaded data.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

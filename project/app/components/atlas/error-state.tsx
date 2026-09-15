import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({
  message = "Unable to load today's plan.",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="border-rose-200 bg-rose-50/40 my-8">
      <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-rose-950">
            {message}
          </h3>
          <p className="text-xs text-rose-800 max-w-md">
            The operational planning engine could not return the current plan. Please verify the backend service connection and try again.
          </p>
        </div>
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-2 border-rose-300 text-rose-900 hover:bg-rose-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

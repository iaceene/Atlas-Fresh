import { PlanApiResponse } from '@/utils/types';

export interface UploadProgressSnapshot {
  loaded: number;
  total: number;
  percentage: number;
}

export async function uploadWorkbook(
  file: File,
  onProgress?: (snapshot: UploadProgressSnapshot) => void
): Promise<PlanApiResponse> {
  return await new Promise<PlanApiResponse>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.responseType = 'json';
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percentage = Math.min(100, Math.max(0, (event.loaded / event.total) * 100));
      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percentage,
      });
    };

    xhr.onerror = () => {
      reject(new Error('The upload could not be completed.'));
    };

    xhr.onabort = () => {
      reject(new Error('The upload was cancelled.'));
    };

    xhr.onload = () => {
      const payload = xhr.response as PlanApiResponse | null;
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(payload?.error || `Upload failed with HTTP ${xhr.status}`));
        return;
      }

      if (!payload) {
        reject(new Error('Upload finished without a server response.'));
        return;
      }

      if (!payload.success) {
        reject(new Error(payload.error || 'Upload failed to parse workbook.'));
        return;
      }

      resolve(payload);
    };

    xhr.send(formData);
  });
}

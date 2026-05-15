/** Triggers a browser download for a generated PDF Blob. */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so Safari has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(input: string, fallback = 'printready'): string {
  const cleaned = (input || fallback)
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return cleaned || fallback;
}

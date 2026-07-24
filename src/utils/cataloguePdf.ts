import {getDocument, PDFDataRangeTransport, type PDFDocumentLoadingTask, type PDFDocumentProxy} from 'pdfjs-dist';

const WIX_FILES_HOST = 'https://71b8e060-1802-4bac-b53f-e99e4fcc3a96.filesusr.com';

export function resolveCataloguePdfUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'www.nk-electrical.com' && parsed.pathname.startsWith('/_files/ugd/')) {
      return `${WIX_FILES_HOST}${parsed.pathname.replace('/_files', '')}`;
    }
  } catch {
    // Preserve CMS-provided relative URLs and let the browser resolve them normally.
  }
  return url;
}

class CatalogueRangeTransport extends PDFDataRangeTransport {
  private controller = new AbortController();
  private failed = false;

  constructor(private url: string, length: number, private onFailure: (error: Error) => void) {
    super(length, null);
  }

  requestDataRange(begin: number, end: number) {
    void fetch(this.url, {
      headers: {Range: `bytes=${begin}-${end - 1}`},
      signal: this.controller.signal,
    }).then(response => {
      if (!response.ok) throw new Error(`Catalogue range request failed (${response.status}).`);
      return response.arrayBuffer();
    }).then(buffer => {
      if (!this.failed) this.onDataRange(begin, new Uint8Array(buffer));
    }).catch(error => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (this.failed) return;
      this.failed = true;
      this.controller.abort();
      this.onFailure(error instanceof Error ? error : new Error('Catalogue range request failed.'));
    });
  }

  abort() {
    this.controller.abort();
  }
}

export async function createCataloguePdfTask(sourceUrl: string, signal?: AbortSignal) {
  const url = resolveCataloguePdfUrl(sourceUrl);
  const response = await fetch(url, {method: 'HEAD', signal});
  if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
  const length = Number(response.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0) throw new Error('Catalogue size is unavailable.');
  let rejectFailure = (_error: Error) => {};
  const failure = new Promise<never>((_resolve, reject) => {
    rejectFailure = reject;
  });
  let task: PDFDocumentLoadingTask | null = null;
  let destroyPromise: Promise<void> | null = null;
  const destroyTask = () => {
    if (!task) return Promise.resolve();
    if (!destroyPromise) destroyPromise = task.destroy();
    return destroyPromise;
  };
  const range = new CatalogueRangeTransport(url, length, error => {
    rejectFailure(error);
    void destroyTask();
  });
  task = getDocument({range, disableAutoFetch: true, rangeChunkSize: 65536});
  const promise: Promise<PDFDocumentProxy> = Promise.race([task.promise, failure]);
  return {
    task,
    promise,
    failure,
    abort: () => {
      range.abort();
      return destroyTask();
    },
  };
}

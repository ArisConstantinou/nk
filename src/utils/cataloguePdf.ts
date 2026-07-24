import {getDocument, PDFDataRangeTransport} from 'pdfjs-dist';

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

  constructor(private url: string, length: number) {
    super(length, null);
  }

  requestDataRange(begin: number, end: number) {
    void fetch(this.url, {
      headers: {Range: `bytes=${begin}-${end - 1}`},
      signal: this.controller.signal,
    }).then(response => {
      if (!response.ok) throw new Error(`Catalogue range request failed (${response.status}).`);
      return response.arrayBuffer();
    }).then(buffer => this.onDataRange(begin, new Uint8Array(buffer))).catch(error => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) console.error(error);
    });
  }

  abort() {
    this.controller.abort();
  }
}

export async function createCataloguePdfTask(sourceUrl: string) {
  const url = resolveCataloguePdfUrl(sourceUrl);
  const headController = new AbortController();
  const response = await fetch(url, {method: 'HEAD', signal: headController.signal});
  if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
  const length = Number(response.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0) throw new Error('Catalogue size is unavailable.');
  const range = new CatalogueRangeTransport(url, length);
  const task = getDocument({range, disableAutoFetch: true, rangeChunkSize: 65536});
  return {task, abort: () => {headController.abort(); range.abort(); void task.destroy();}};
}

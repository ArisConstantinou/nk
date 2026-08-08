export function withoutRecordEditorSearchParams(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.delete('record');
  next.delete('new');
  return next;
}

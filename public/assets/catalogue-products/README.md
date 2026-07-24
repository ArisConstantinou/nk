# NK Electrical catalogue product images

Every catalogue product has one local image named by its product ID.

```text
catalogue-products/
  lighting/
    cutouts/
    photos/
  appliances/
    cutouts/
    photos/
  manifest.json
```

- `cutouts/` contains transparent product renders displayed with `object-fit: contain`.
- `photos/` contains lifestyle or full-frame product photography.
- `manifest.json` records each local path, original source, dimensions, file type, and enhancement audit.

Maintenance commands:

```bash
npm run products:localize-images
npm run products:verify-images
```

The localizer is non-destructive on an already-localized catalogue. Pass `-- --refresh` only when the source archive should be downloaded again; refreshed files then need to pass the image-quality audit again.

# Automatic Max Card

`maxcard.html` is now the automatic creator. Upload the two screenshots and generation starts without entering values, drawing boxes, or checking confirmations. The existing advanced compositor is retained at `maxcard-manual.html` for custom layouts, and is not part of the automatic flow.

## Supported input

The initial supported template is measured from the user's Gabriel references:

- Full landscape FC Mobile Player Profile, approximately 2.197:1, including card, six attributes, training, rank, PlayStyles and Skills sections.
- Full square RenderZ export, at least 1600×1600 pixels, with player card at upper left, player name at upper right, six skill tiles across the upper section and a 3×2 attribute grid.
- Unranked base card paired with a five-rank target (target OVR = base OVR +5) and exactly five visible skill points.
- PNG/JPEG/WebP, at most 15 MB and 12 MP, each edge at least 300 px and at most 8192 px.

Different crops, layouts, goalkeeper attributes, already-ranked bases, unsupported languages and unreadable text are rejected. The feature does not promise arbitrary screenshot recognition. Similar aspect ratio alone is insufficient: six attribute labels plus the training, rank, PlayStyles and skills headings are checked using OCR at the expected layout anchors. Player names must share a readable name token. This is a conservative name check, not a unique player-ID match.

## Processing

`maxcard-layout.js` holds the measured normalized regions, RenderZ reading windows and validation. `maxcard-auto.js` decodes both images locally, runs pinned Tesseract.js 5.1.1, checks layout anchors and names, reads all seven target numbers and six skill-level markers, reads the base attributes for a monotonic-upgrade check, and validates the values. Low-resolution RenderZ captures are rejected because OCR can silently drop a leading digit. Numbers are read from the upload, never filled with Gabriel constants. Five orange rank indicators and training 30/30 are the requested max-card defaults. Position is preserved automatically; this mode never changes an alternate position.

The output is a new original-resolution Canvas initialized with source ImageData using a consistent CPU readback path for color-profile handling. Integer-aligned patch commits prevent rasterization fringes from changing pixels outside a mask. Only declared upgrade masks are edited. Number backgrounds use per-column interpolation between clean source pixels above and below each number. This is deterministic reconstruction, not generative AI; small textures inside a replaced number mask may be simplified. Fonts use Roboto Condensed/Arial fallbacks and approximate the UI. Active skill diamonds are clipped copies from the uploaded RenderZ screenshot; inactive skill slots remain untouched. Rank/badge assets are small crops from the user's expected max-card reference; see `assets/maxcard/README.md`. Buttons are deterministic blue rounded controls.

The max-card reference is not used as the base image. Portrait, kit, name, card frame, personal information, stamina/skill stars and PlayStyles remain from the uploaded base. Every channel outside the union of edit masks is compared before PNG encoding and again after decoding the encoded PNG. Any difference blocks the result. The guarantee applies to this recognized layout and declared masks; it does not constitute semantic segmentation of arbitrary player portraits. Mask tests also check protected reference regions.

No screenshot upload API, AI API key, database or authentication is required. OCR model/worker/WASM assets and Google Fonts need internet access on first use. Images remain in memory for the current tab and are not persisted. Full user references are not deployed or committed.

## Verification

```sh
node --test tests/maxcard-auto.test.cjs tests/maxcard-core.test.cjs
node --check maxcard-auto.js
node --check maxcard-layout.js
```

`tests/maxcard-auto-browser.html` tests actual uploads of the supplied real Gabriel images, automatic OCR and generation, values 127 / 179 / 137 / 138 / 158 / 231 / 222, skill allocations 2/1/0/0/1/1, original PNG dimensions and pixel identity outside every edit mask. It requires a localhost fixture server exposing `/__fixtures__/base.png` and `/__fixtures__/renderz.webp`; these private full screenshots are deliberately absent from the repository. The expected max-card image is a styling reference, not an exact pixel-match target: its face/artwork and PlayStyles differ from the base, which this tool must preserve.

The real-image integration check also resizes the base to 1862×847 while retaining the full-resolution RenderZ export to verify normalized-coordinate support. A separate negative check verifies that a 1024×1024 RenderZ capture is rejected rather than generating an incorrect stat.

The old manual-workflow test page points at `maxcard-manual.html`. Synthetic tests do not establish automatic support for other game or RenderZ layouts. Device/network speed affects runtime; measured browser-test durations are reported separately from a universal performance promise.

## Deployment files

Deploy `maxcard.html`, `maxcard-auto.js`, `maxcard-auto.css`, `maxcard-layout.js`, `maxcard-core.js`, existing shared styles/scripts and `assets/maxcard/{level30,rank-orange}.png`. Keep old manual-editor files available if its URL should continue working.

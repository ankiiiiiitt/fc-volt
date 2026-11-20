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

For supported 8-bit non-interlaced RGB/RGBA PNG uploads, `maxcard-png.js` decodes source RGBA directly from the file and retains ICC/cICP/sRGB/gamma/chromaticity metadata. Browser-decoded JPEG/WebP and other PNG variants use a single captured source snapshot. Canvas renders only the permitted edits. Integer-aligned patch copies are assembled onto the immutable source pixel array in CPU memory; the output PNG is encoded and decoded without canvas APIs. This prevents canvas fingerprinting protection or repeated-read color rounding from introducing false preservation failures. Unsupported PNG variants use the browser snapshot path; exact original-file samples and color-profile retention are guaranteed only for the supported PNG types. Only declared upgrade masks are edited. Number backgrounds use per-column interpolation between clean source pixels above and below each number. This is deterministic reconstruction, not generative AI; small textures inside a replaced number mask may be simplified. Fonts use Roboto Condensed/Arial fallbacks and approximate the UI. Active skill diamonds are clipped copies from the uploaded RenderZ screenshot; inactive skill slots remain untouched. Rank/badge assets are small crops from the user's expected max-card reference; see `assets/maxcard/README.md`. Buttons are deterministic blue rounded controls.

The max-card reference is not used as the base image. Portrait, kit, name, card frame, personal information, stamina/skill stars and PlayStyles remain from the uploaded base. Every channel outside the union of edit masks is compared before PNG encoding and again after decoding the encoded PNG with the lossless byte-level decoder. The comparison tolerance remains zero; no failing check is skipped. Any difference blocks the result. The guarantee applies to this recognized layout and declared masks; it does not constitute semantic segmentation of arbitrary player portraits. Mask tests also check protected reference regions.

No screenshot upload API, AI API key, database or authentication is required. OCR model/worker/WASM assets and Google Fonts need internet access on first use. Images remain in memory for the current tab and are not persisted. Full user references are not deployed or committed.

## Verification

```sh
node --test tests/maxcard-png.test.cjs tests/maxcard-auto.test.cjs tests/maxcard-core.test.cjs
node --check maxcard-auto.js
node --check maxcard-layout.js
```

`tests/maxcard-auto-browser.html` tests actual uploads of the supplied real Gabriel images, automatic OCR and generation, values 127 / 179 / 137 / 138 / 158 / 231 / 222, skill allocations 2/1/0/0/1/1, original PNG dimensions and pixel identity outside every edit mask. It requires a localhost fixture server exposing `/__fixtures__/base.png` and `/__fixtures__/renderz.webp`; these private full screenshots are deliberately absent from the repository. The expected max-card image is a styling reference, not an exact pixel-match target: its face/artwork and PlayStyles differ from the base, which this tool must preserve.

The real-image integration check also resizes the base to 1862×847 while retaining the full-resolution RenderZ export to verify normalized-coordinate support. The browser test also injects changing noise into every canvas pixel read to simulate privacy-protected readbacks; the resulting PNG must still retain source samples and profile metadata exactly outside edit masks. Codec unit tests cover RGB/RGBA, all five PNG row filters, alpha, CRC rejection, independent zlib fixtures and a real-image roundtrip. A separate negative check verifies that a 1024×1024 RenderZ capture is rejected rather than generating an incorrect stat.

The old manual-workflow test page points at `maxcard-manual.html`. Synthetic tests do not establish automatic support for other game or RenderZ layouts. Device/network speed affects runtime; measured browser-test durations are reported separately from a universal performance promise.

## Deployment files

Deploy `maxcard.html`, `maxcard-png.js`, `maxcard-auto.js`, `maxcard-auto.css`, `maxcard-layout.js`, `maxcard-core.js`, existing shared styles/scripts and `assets/maxcard/{level30,rank-orange}.png`. Keep old manual-editor files available if its URL should continue working.

PNG and compression references: [W3C PNG specification](https://www.w3.org/TR/png/) and [WHATWG Compression Streams](https://compression.spec.whatwg.org/). These require a modern browser supporting CompressionStream/DecompressionStream. Full reference screenshots remain local test fixtures.

Scaled and shifted landscape profile panels are located from the continuous neon stats border. All base OCR crops and output edit masks follow the detected transform, preserving padding and the bottom navigation. Yamal 2796×1290 and Gabriel references pass original, resized, and canvas privacy cases.

## Editable OCR review
After scanning, detected OVR, six stats and six skill allocations remain editable. Name mismatches and unreadable fields open review instead of blocking or inventing values. A failed OCR download can also fall back to manual entry once the profile geometry and RenderZ dimensions are validated. Correct fields and choose Generate preview; numeric ranges and a five-point allocation remain required. Editing invalidates the previous result and regenerates patches from the original pixels. The editable player name labels the result/download; the uploaded artwork name remains intact.

Control and skill rectangles use canonical 2804×1276 coordinates before the detected scale/offset is applied. Do not substitute screenshot coordinates into this table. The rank row clears six slot positions; rank level 5 leaves the final slot inactive and rank level 6 fills it. Review exposes rank level explicitly and the summary reports the selected value. The training bar retains the source styling. Lahm reference validation uses user-entered in-game values because the supplied RenderZ export has different stats.

Native controls: `maxcard-native.js` maps UI slots through the detected profile transform, preserves already-correct icons and rank states, and uses native game sprites for matching upgraded skills. RenderZ now supplies skill levels, not the visual icon artwork. All six skill masks permit changing a previously active skill back to zero. The alignment browser harness additionally checks pixel-exact preservation of native Lahm ranks/skills and restoration from a synthetic dimmed input against the reference. This synthetic check is not a substitute for testing a real unranked source; unrecognized native skill sprites use a brightness-restoration approximation. OCR and the differing RenderZ stat values are unchanged.

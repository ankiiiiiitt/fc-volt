# FC-VOLT Max Card Generator

Open `maxcard.html` through the same static hosting used for the existing pages. No build, backend, database, account, API key, or environment variable is needed.

## Implementation plan and architecture

1. Preserve existing standalone tools and their styles. Add a new page with the same Inter/Teko typography, dark panels, green/blue accents and template navigation.
2. Decode uploads locally; retain source dimensions. Collect explicit target values and skill allocations.
3. Calibrate normalized rectangular masks on the actual screenshot. Composite onto a source copy, clipping every operation to its mask.
4. Run browser-local Tesseract OCR on RenderZ; parse conservative labeled suggestions and require review.
5. Validate values, PNG dimensions and pixel identity outside the mask union; test using Gabriel values on synthetic images at multiple resolutions.
6. Add only a navigation link to each existing page and document static deployment.

`maxcard-core.js` contains the conservative OCR parser, validation, normalized region scaling and RGBA comparison. `maxcard.js` handles uploads, OCR worker lifecycle, calibration, approved icon cropping, Canvas drawing, PNG verification, preview and download. `maxcard.css` is scoped by being loaded only on the new page.

## Run

```sh
python3 -m http.server 8088
```

Visit `http://localhost:8088/maxcard.html`. Use a current browser with Canvas, createImageBitmap, WebAssembly, Pointer Events and document.fonts support.

## Workflow

1. Upload a full FC Mobile screenshot (PNG recommended) and the RenderZ screenshot. Supported formats: PNG, JPEG, WebP. Each file is limited to 15 MB, 12 megapixels and a maximum edge of 8192 px. Decoded dimensions are checked before allocating working canvases; the browser still needs memory to decode the file first.
2. RenderZ scanning starts automatically after upload. **Scan again** is available inside **Enter stats manually instead**. Click **Review stats** to open step 2. The OCR engine and English language data download on demand. Your screenshot is processed locally and is never uploaded. If downloads fail, use manual entry. Edit OCR text and reparse if helpful.
3. Review OVR, all six attributes, position and skill allocations. Enter each skill as `Name +N`, one per line, totaling five points. Missing or conflicting values are blank. Overall OCR confidence is shown in the review notes; it is not a per-field guarantee. All OCR values require explicit review, regardless of confidence.
4. Position is reference-only by default. To change the visible card position, select a valid position and explicitly check the alternate-position confirmation; a separate position mask becomes required. The app cannot verify whether a player is eligible for that alternate position.
5. On the Review step, open **Screenshot setup** (it also opens when generation needs missing boxes). Choose a region and drag a tight box over the original value on the source canvas. Mark both OVRs, all six attributes, training text, progress bar, badge, rank diamonds, training control, rank control and one point region per skill. Do not include player artwork, names, stars or PlayStyles. The next unmarked field is selected automatically after each box. Background color is sampled just outside the box as a starting point. Expand **Advanced adjustments** for numeric X/Y/W/H controls and precise styling. Coordinates are percentages of the source dimensions.
6. Match text color, font and text height per region. For flat backgrounds, sample a clean source pixel. For textured backgrounds, select a clean patch with the same aspect ratio (within 5%). This patch is copied from the untouched source; it is not AI inpainting. For a seamless card-OVR replacement, the user must supply a suitable clean patch from that artwork. Solid color cannot reconstruct complex artwork.
7. Skill icons are preserved unless an optional skill-icon destination is marked. For each marked icon region, select an approved source crop from RenderZ or a user-supplied licensed icon sheet. Original proportions are retained. Crops are copied, not regenerated. Only use assets you have rights to use. This interface is for skill-upgrade icons, never PlayStyles.
8. Inspect all masks and confirm that protected content is outside them. Generate, review with the before/after slider, and download the PNG. Changes to settings invalidate the old export.
9. After a successful export, the latest layout geometry and styles are saved in browser localStorage and restored automatically for screenshots whose aspect ratios match within 1%. Inspect and confirm every restored box; matching aspect ratios do not guarantee the same game layout. Optional icon masks and confirmed alternate-position masks are not restored automatically. You can also save a JSON layout to reuse calibration. Layouts accept matching aspect ratios within 1%, scale coordinates to the new resolution and must be rechecked. Icon pixels are not embedded; reselect crops after loading. Skill names/values are not stored in layouts, so enter them before loading the corresponding layout.

The Gabriel example fills target OVR 127, attributes 179/137/138/158/231/222 and Defender +2, Scoring +1, Defending +1, Physical +1. It is an explicit sample-data action and does not pretend to extract those values from an uploaded screenshot. Position CB remains unchanged unless explicitly confirmed.

## Preservation guarantee and its boundary

Every drawing operation is clipped to its integer pixel mask. Export compares every RGBA channel outside the mask union against the browser-decoded source, first in Canvas and again after encoding and decoding the PNG. Any difference blocks export. The output remains at original resolution, without whole-image scaling or cropping.

This proves pixel identity **outside user-approved masks**, not semantic recognition of protected objects. A badly selected mask can cover a face, frame, star or PlayStyle. The app cannot identify or protect those inside a selected mask. Users must inspect mask placement. JPEG source pixels are compared after browser decoding, not against compressed file bytes. PNG files may have different metadata/color profiles even where decoded pixel values match. Transparent sources with hidden RGB information may fail round-trip verification; use an opaque screenshot.

## OCR support and visual limitations

- No real FC Mobile or RenderZ reference screenshot was supplied with this task. Automatic screenshot-layout recognition and production-quality font/artwork matching have **not** been validated. No guessed presets are applied; calibration is required for every new layout.
- OCR supports clearly labeled `OVR`/`Overall`, `Pace`/`Pacing`, Shooting, Passing, Dribbling, Defending and Physical/Physicality followed by a number on the same line, plus number-first lines. Duplicate conflicting values remain blank. Standalone valid position codes and explicitly labeled player names are recognized. Unlabeled names, split-line/circular stat layouts, non-English labels and many skill layouts need manual correction. Missing values are never inferred from unrelated numbers.
- Skill OCR supports explicit `Name +1` through `Name +5` lines. Skill trees without that textual notation require manual entry. Goalkeeper-specific attributes are not mapped into the six outfield fields.
- Supplied fonts approximate the game UI. There are no bundled proprietary game fonts or icon assets. Rank diamonds, orange badge, progress bar and active controls are geometric approximations. A convincing real screenshot may require careful clean-patch selection and approved assets; this is not an automatic pixel-perfect reconstruction of EA's UI.
- Calibration masks are visible on the source. Generated output is reviewed after generation; there is no live text-overlay preview or zoom control. Browser zoom and percentage inputs can help precise placement.
- Large screenshots use several full-resolution pixel buffers during verification. Mobile browsers with limited memory may need smaller originals. OCR can be slow on phones.
- Screenshots and stats are not persisted. The latest successful layout geometry and styling are retained in localStorage (`fcvolt_maxcard_layout_v2`); source images, OCR text and icon crops are not saved. User-downloaded layout files also store region geometry and styles only.

## Tests

Dependency-free unit checks:

```sh
node --test tests/maxcard-core.test.cjs
node --check maxcard-core.js
node --check maxcard.js
```

With the HTTP server running, open `http://localhost:8088/tests/maxcard-browser.html` and click **Run integration checks**. This exercises actual browser file inputs, example values, JSON layout import, compositing and encoded PNG export at 960×540 and 1440×810; checks original dimensions and unchanged pixels outside masks; checks a simulated protected artwork/PlayStyles row; tests the comparison slider, stale-download invalidation and rejected incomplete inputs; then runs the actual Tesseract engine on a synthetic labeled image. The OCR check requires internet access. Synthetic image tests do not establish accuracy on real game screenshots.

Manual acceptance with real screenshots remains necessary: use Gabriel and other player profiles; calibrate all regions; visually inspect card OVR background, fonts, controls, skills and icons; verify unchanged name, portrait, kit, frame, nationality/club/league, height/weight, foot, stamina, skill stars and PlayStyles. Check exported resolution and the reported zero outside-mask changes. Also test keyboard navigation, touch calibration, invalid uploads and unavailable OCR downloads.

## Deployment, security and cost

Deploy the existing static repository normally (including Vercel or GitHub Pages). Include `maxcard.html`, `maxcard.css`, `maxcard-core.js`, `maxcard.js` and the six updated navigation pages. Do not replace the existing homepage or unrelated assets. There is no new server endpoint or paid OCR API. Costs are your normal static hosting/bandwidth; device CPU and memory handle image processing.

OCR loads pinned Tesseract.js 5.1.1 from jsDelivr; its worker, WASM and English language assets also require network access. Existing Google Fonts are reused. Offline manual processing works with fallback fonts after the local page assets are available. A restrictive hosting CSP must allow the chosen script/worker/WASM/model/font origins and local blob URLs. For a fully offline deployment, vendor the OCR files and configure Tesseract workerPath/corePath/langPath following its official local-installation documentation. No frontend secrets exist.

Reference: [Tesseract.js official documentation](https://github.com/naptha/tesseract.js) and [local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md).

## Changed files

New Max Card files: `maxcard.html`, `maxcard.css`, `maxcard.js`, `maxcard-core.js`, `MAXCARD.md`, `tests/maxcard-core.test.cjs`, `tests/maxcard-browser.html`.

Site structure: `index.html` is now Home; the original tier-list tool is preserved in `tierlist.html`. `site.css` and `site.js` provide common navigation and editor controls, and `home.css` styles the Home page.

Updated: `README.md` (feature entry), `index.html`, `team11.html`, `top10.html`, `shards.html`, `players.html`, `claim.html` (shared sidebar, page headings, grouped actions and appearance settings).

The site uses the existing Vercel project. Publish the complete static directory, including `tierlist.html`, `site.css`, `site.js` and `home.css`, along with the existing assets.

## Fast workflow expectations

The UI presents one step at a time and starts OCR automatically. The calibration screen advances after each rectangle and reuses the most recent layout after a successful export. This reduces repeated setup, but does not guarantee a complete human workflow under two minutes. OCR download/processing time, manual corrections, first-time calibration, screenshot layout changes and device performance affect total time. Automated synthetic tests record their elapsed runtime separately; that is not a human usability timing claim.

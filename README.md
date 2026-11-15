# FC_VOLT — FC Mobile Player Tier List

A high-performance, dark esports tier list creator designed specifically for FC Mobile weekly player rankings.

## Features & Highlights

1. **Exact 4-Tier Visual Design**:
   - ♛ **SUPER** (Electric Green Nebula)
   - 👍 **GOOD** (Electric Blue Nebula)
   - ☻ **AVERAGE** (Fiery Gold Nebula)
   - ✕ **BAD** (Fiery Red Nebula)

2. **Easy Player Card Uploads**:
   - Click **＋ UPLOAD PLAYER PICTURES** to select multiple player cards at once.
   - Or **drag and drop image files directly from your computer/desktop** onto the Player Cards Bench or straight into any slot!
   - Automatic client-side canvas compression/resizing (keeps images crisp while drastically reducing storage size so browser memory and `localStorage` never overflow).

3. **Smooth Card Placement**:
   - **Drag & Drop**: Drag from bench into any slot, drag from slot to slot to swap, or drag back to bench.
   - **Click / Tap to Place**: Click any card in the bench to select it, then click any slot to place it instantly (great for both mobile touch and desktop).
   - Click any empty slot to pick an image directly for that specific slot.
   - Click **＋** at the end of each tier row to add more slots dynamically.

4. **Clearing & Resetting**:
   - **🗑️ REMOVE ALL**: One-click wipe across all templates to remove all cards completely from both the field/board and the bench pool for a 100% fresh start.
   - **🔄 RESET BOARD / PITCH**: Returns all placed cards back to the bench tray without deleting them.
   - **🗑️ CLEAR BENCH**: Removes all unused bench cards.

5. **Saving & Exporting**:
   - **🖨️ PRINT / PDF**: Automatically hides all unused empty slots and edit buttons. Includes a clean printed header with the Week/Team title.
   - **📸 EXPORT IMAGE**: Generates and downloads a clean, high-resolution PNG image without empty slots or helper buttons for YouTube community posts, WhatsApp, Discord, or Instagram.
   - **👁️ CLEAN VIEW**: On-screen toggle to preview the tier board or squad without any empty slots or editing helpers.
   - **💾 SAVE WEEK / SQUAD**: Stores the configuration locally in your browser.
   - **⚡ PREVIEW DEMO**: Instantly populates realistic FC Mobile demo cards for quick testing.

## Available Templates

1. **[Best Team 11 Squad Builder Template (team11.html)](file:///Users/ankitkumar/Downloads/Fc_Volt%202/team11.html)**:
   - **Authentic 3D Stadium & Football Pitch**: Realistic night match stadium atmosphere with floodlights shining down onto a green perspective pitch with field lines and center circle.
   - **11 Starting Positions with Direct Screenshot Upload**: Click directly on any of the 11 positions (e.g. ST, LW, RW, CM, CAM, LB, CB, RB, GK) to upload screenshot cards from your phone or PC.
   - **Multi-Formation Support**: Seamlessly switch between formations:
     - **4-3-3 Attack** (Default, exactly matching the screenshot: LW Díaz, ST Haaland, RW Shevchenko, LCM Pedri, CAM Messi, RCM Pirlo, LB Lizarazu, LCB Baresi, RCB Barzagli, RB Lahm, GK Courtois)
     - **4-3-3 Holding**, **4-3-3 Flat**, **4-4-2 Flat**, **4-1-2-1-2 Wide**, **4-2-3-1**, **3-4-3**, and **5-2-2-1**.
   - **Tactical Badges & Overlays**: Green position pills (`LW`, `ST`, `GK`, etc.), optional Rank 30 gold badges, customizable Team OVR (`126 OVR`), and bottom-right gold crown team crest.
   - **Bench & Drag-and-Drop**: Multi-card upload bench tray, auto-fill squad, click-to-place, drag-to-swap, and return-to-bench.
   - **⚡ Preview Demo XI**: One-click demo squad loading all 11 players from the reference screenshot.
   - **Export Options**: 2.5x high-res PNG download (automatically hides empty slot outlines and edit buttons for clean screenshot), high-res landscape PDF export, Print, and browser auto-save.

2. **[Top 10 Best Players Template (top10.html)](file:///Users/ankitkumar/Downloads/Fc_Volt%202/top10.html)**:
   - **Vibrant Gradient Background**: Electric neon pink to glowing purple gradient matching the YouTube/community ranking style.
   - **Top 10 Layout**: 3 rows (3 cards in Row 1, 3 cards in Row 2, 4 cards in Row 3).
   - **Yellow Numeric Badges**: Bold yellow circular badges numbered **1** through **10** with thick black outlines positioned at the top-right of each player card.
   - **Customizable Title**: Editable text (e.g. "Top 10 Best CB In FC Mobile", "Top 10 Best ST In FC Mobile") with thick black outline.
   - **Quick Demo Cards**: Click **⚡ PREVIEW 10 DEMO CARDS** to load the 10 CB cards (Lúcio, Van Dijk, Maldini, Baresi, Blanc, Beckenbauer, Varane, Chiellini, Desailly, Barzagli) matching the reference picture.
   - **Flexible Background Themes**: Neon Magenta/Purple, Deep Violet, Electric Blue, Dark Esports, Fiery Flame, or Custom color pickers.
   - **Export**: One-click **📸 EXPORT IMAGE** for crystal-clear 2.5x retina PNG image download.

3. **[4-Tier Ranking Template (index.html)](file:///Users/ankitkumar/Downloads/Fc_Volt%202/index.html)**:
   - ♛ **SUPER** (Electric Green Nebula)
   - 👍 **GOOD** (Electric Blue Nebula)
   - ☻ **AVERAGE** (Fiery Gold Nebula)
   - ✕ **BAD** (Fiery Red Nebula)

4. **[Football Shard Comparison Template (shards.html)](file:///Users/ankitkumar/Downloads/Fc_Volt%202/shards.html)**:
   - **Official Shard Currency System**: Automatically assigns the configured fixed shard value (e.g. `8,300`) with the official blue shard icon above every player card.
   - **Dynamic Comparison Sections**:
     - **Left Section**: `[PLAYER] IS BETTER` (with green checkmark `✓` indicators)
     - **Right Section**: `BETTER THAN [PLAYER]` (with red cross `✕` indicators)
   - **Step-by-Step Workflow**: Configure main baseline player, set default shard value, dynamically add comparison cards, organize results, and preview live.
   - **Dynamic Card Management**: Upload or replace card images, edit player details (OVR, Position, Shard override), reorder, and swap sections with one click.
   - **eFootball-Inspired Aesthetics**: Dark stadium background with floodlights, metallic card frames, glowing accents, and modern football typography.
   - **Instagram 4:5 Ready Export**: One-click download as high-resolution PNG (1080 × 1350) and optimized JPG (1080 × 1350) without editor controls.
   - **⚡ Preview Demo**: One-click demo loading Vini Jr. comparison matching the reference design.

## How to Run in Terminal

Since this is a client-side web application with offline support and zero build dependencies, you can start it instantly in Terminal using any of the methods below:

### Method 1: Python HTTP Server (Recommended)
Open your Terminal app on Mac and run:

```bash
cd "/Users/ankitkumar/Downloads/Fc_Volt 2"
python3 -m http.server 8088
```

Then open your browser and navigate to:
- 💎 **Football Shard Comparison**: [http://localhost:8088/shards.html](http://localhost:8088/shards.html)
- ⚽ **Best Team 11 Squad Builder**: [http://localhost:8088/team11.html](http://localhost:8088/team11.html)
- 🔟 **Top 10 Best Players Template**: [http://localhost:8088/top10.html](http://localhost:8088/top10.html)
- 📊 **4-Tier Performance List**: [http://localhost:8088/index.html](http://localhost:8088/index.html)

---

### Method 2: Node.js `serve` / `http-server`
If you prefer Node.js:

```bash
cd "/Users/ankitkumar/Downloads/Fc_Volt 2"
npx -y serve -p 8088 .
```

---

### Method 3: Direct Open (macOS)
You can also open the HTML files directly in your default browser:

```bash
cd "/Users/ankitkumar/Downloads/Fc_Volt 2"
open team11.html
```

*(Note: Running via a local HTTP server like Method 1 is recommended for full html2canvas PNG export and canvas processing support).*

---

## Recent Updates & Powerful Tools

- **🪄 REMOVE BACKGROUND & OUTLIERS STUDIO**:
  - Automatically isolates player cards by flood-filling external screenshot borders inward.
  - Removes white margins, black letterbox bars, and edge halos.
  - Leaves internal white kits (e.g. Real Madrid), skin tones, and stats 100% intact.
  - Interactive canvas preview stage with 🏁 Grid, 🏟️ Pitch Stadium, ⬛ Black, and ⬜ White backdrops.
  - Touch-up tools: 🎨 Eyedropper & 🧹 Manual Eraser Brush.
- **📏 DYNAMIC CARD SIZING (Best Team 11)**:
  - Default card size increased to a prominent, bold **154px × 206px**.
  - Dropdown in controls bar to switch between **Compact (132px)**, **Normal (144px)**, **Large (154px)**, and **Extra Large (168px)** with auto-save.
- **🗑️ REMOVE ALL CONFIRMATION MODAL**:
  - Dedicated in-app safety modal to clear all pitch/tier cards and bench cards without getting dismissed prematurely.

## Max Card Generator

[Max Card Generator](maxcard.html) adds a browser-local, fan-made level-30 preview tool with RenderZ OCR suggestions, manual value confirmation, calibrated edit masks, approved skill-icon crops, before/after comparison and original-resolution PNG export. Every export verifies that pixels outside the selected masks remain identical. New screenshot layouts require manual calibration; real screenshot visual accuracy remains to be validated.

See [setup, workflow, limitations, tests and deployment instructions](MAXCARD.md). Run core tests with `node --test tests/maxcard-core.test.cjs`; open `tests/maxcard-browser.html` through the local server for browser integration checks.

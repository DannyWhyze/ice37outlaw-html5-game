# Outlaw — Native HTML5 Game (Lords of Brooklyn Remake)

Enterprise repository for modernizing and preserving **Lords of Brooklyn / Outlaw** (2D Urban Graffiti & Street Fighter Flash Game) as a native HTML5 Canvas application.

---

## Project Background & Porting

This project is a modern HTML5 porting and preservation effort of the original Flash game **Lords of Brooklyn / Outlaw** (Urban Graffiti & 2D Beat 'Em Up Street Fighter).

- **Original Stack:** ActionScript 2.0 (Flash SWF).
- **Modern Stack:** Native HTML5 Canvas powered by Phaser 3.80.
- **Porting Highlights:** Reverse-engineered AS2 logic, HD rasterized sprite sheets, frame-accurate Flash matrix placements, 4-tier z-index rendering, and custom photo gallery persistence.

---

## Quick Start (Execution Commands)

Run all terminal commands from the repository root: `E:\VS_DW\PlayGround\Project_idea\outlaws_lob_game`.

### Option A: Game Server with Photo Persistence (Recommended)

Serves the game canvas and persists Polaroid gallery photos as PNG files to local disk (`gallery/` folder):

```bash
python src/ice37_outlaw_html5/tools/gallery_server.py --port 8000
```

Browser Access: **`http://127.0.0.1:8000`**

### Option B: Static Web Server (Browser IndexedDB Storage)

Serves the static game canvas; photos fall back to local browser IndexedDB storage:

```bash
python -m http.server 8000 --directory src/ice37_outlaw_html5/game
```

Browser Access: **`http://127.0.0.1:8000`**

---

## Game Controls

- **Move Left / Right:** `A` / `D` or `Left Arrow` / `Right Arrow`
- **Box / Punch:** `W` or `Up Arrow`
- **Kick:** `S` or `Down Arrow`
- **Spray / Paint:** `Left Mouse Click & Drag`
- **Backpack / Tools:** Click the backpack icon or press `E` to toggle tool palette

> [!NOTE]
> **Mobile Browser Notice:** The current build is optimized for desktop browsers with physical keyboard and mouse controls. Touch controls for mobile browsers (virtual D-pad and on-screen touch buttons) are currently not optimized, but are planned for an upcoming release.

---

## Repository Layout

```text
outlaws_lob_game/
├── public/                     # Static Web Entry Point
│   └── index.html              # Standalone HTML5 Game Entry Point
├── src/                        # Source Code
│   └── ice37_outlaw_html5/     # Phaser 3 Native Engine Source
│       ├── tools/              # Decompilation & Gallery Server Scripts
│       ├── extracted/          # AS2 logic, exported PNGs, MP3s
│       └── game/               # Phaser 3 Game Code (Scenes, Prefabs, Logic)
└── LICENSE                     # Proprietary License Terms
```

---

## Engine Architecture & Scenes

- **`HomeScene`**: Hideout room featuring window train animations, background shake, dedicated audio (`trainspotting_80-519.mp3`), and persistent floor spray-can inventory.
- **`MenuScene`**: Dynamic scene navigator (`HALL OF FAME`, `STREET BOMBING`, `TRAINYARD BOMBING`, `GALLERY`).
- **`HallOfFameScene`**: Submarine graffiti train hall with real-time vector spray mask (Shape 114), custom tool cursors (spray can, paint roller, backpack hover), tool palette, and emergency exits.
- **`StreetScene`**: Horizontal scrolling street alleyway panorama (`162.jpg`) with beat 'em up combat (boxing, kicking), backpack spray palette, emergency exit doors, and cop spawning logic.
- **`TrainyardScene`**: Trainyard subway train spray canvas scene with interactive spraying, cop AI, and environmental hazards.
- **`Prefabs Architecture`**: Decoupled interactive actors under `src/ice37_outlaw_html5/game/js/prefabs/` (`Player`, `Cop`, `Backpack`, `SprayCanvas`, `CameraHud`, `GalleryOverlay`, `DevControls`, `Blende`, `Hud`) guaranteeing consistent combat state machines, hitboxes, and controls across all scenes.

---

## License

This project is proprietary and confidential. See [`LICENSE`](LICENSE) for details.

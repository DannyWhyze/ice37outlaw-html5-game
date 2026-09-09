const assert = require('node:assert/strict');
const test = require('node:test');

const { GalleryOverlay } = require('../js/prefabs/GalleryOverlay.js');
const { MemoryStorageAdapter, GalleryStorageService } = require('../js/logic/galleryStorage.js');

const VALID_1X1_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function createMockScene() {
    const makeDisplayObject = () => ({
        depth: 0,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        visible: true,
        alpha: 1,
        angle: 0,
        width: 0,
        height: 0,
        children: [],
        listeners: {},
        add(items) {
            if (Array.isArray(items)) this.children.push(...items);
            else this.children.push(items);
            return this;
        },
        remove(item) {
            const idx = this.children.indexOf(item);
            if (idx >= 0) this.children.splice(idx, 1);
            return this;
        },
        removeAll() {
            this.children = [];
            return this;
        },
        setSize(w, h) { this.width = w; this.height = h; return this; },
        setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
        setDepth(d) { this.depth = d; return this; },
        setInteractive(opts) { this.interactiveOptions = opts; return this; },
        disableInteractive() { this.interactiveOptions = null; return this; },
        setAlpha(a) { this.alpha = a; return this; },
        setOrigin() { return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
        setAngle(ang) { this.angle = ang; return this; },
        setVisible(v) { this.visible = v; return this; },
        setTexture(k) { this.texture = k; return this; },
        setText(t) { this.text = t; return this; },
        setColor(c) { this.color = c; return this; },
        setStrokeStyle() { return this; },
        on(evt, cb) { this.listeners[evt] = cb; return this; },
        emit(evt, ...args) {
            if (this.listeners && this.listeners[evt]) return this.listeners[evt](...args);
        },
    });

    return {
        add: {
            container: (x = 0, y = 0) => {
                const c = makeDisplayObject();
                c.x = x;
                c.y = y;
                return c;
            },
            image: (x = 0, y = 0, key = '') => {
                const img = makeDisplayObject();
                img.x = x;
                img.y = y;
                img.texture = key;
                return img;
            },
            rectangle: (x = 0, y = 0, w = 0, h = 0) => {
                const r = makeDisplayObject();
                r.x = x;
                r.y = y;
                r.width = w;
                r.height = h;
                return r;
            },
            text: (x = 0, y = 0, textContent = '', style = {}) => {
                const t = makeDisplayObject();
                t.x = x;
                t.y = y;
                t.text = textContent;
                t.style = style;
                return t;
            },
        },
        textures: {
            exists: () => true,
            addBase64: () => {},
        },
        input: {
            listeners: {},
            keyboard: {
                listeners: {},
                on(evt, cb) { this.listeners[evt] = cb; return this; },
                emit(evt, ...args) { if (this.listeners[evt]) return this.listeners[evt](...args); },
            },
            on(evt, cb) { this.listeners[evt] = cb; return this; },
            emit(evt, ...args) { if (this.listeners[evt]) return this.listeners[evt](...args); },
        },
        tweens: {
            add: (config) => {
                if (config.onComplete) config.onComplete();
                return { stop() {} };
            },
        },
    };
}

test('GalleryOverlay instantiates with closed initial state and depth 250', () => {
    const scene = createMockScene();
    const adapter = new MemoryStorageAdapter();
    const storage = new GalleryStorageService({ adapter });

    const overlay = new GalleryOverlay(scene, { storage });

    assert.equal(overlay.isOpen, false);
    assert.equal(overlay.container.visible, false);
    assert.equal(overlay.container.depth, 250);
    assert.ok(overlay.backdropImage, 'Backdrop image must exist');
    assert.ok(overlay.closeButton, 'Close button must exist');
});

test('GalleryOverlay displays empty state text when storage contains no photos', async () => {
    const scene = createMockScene();
    const adapter = new MemoryStorageAdapter();
    const storage = new GalleryStorageService({ adapter });

    const overlay = new GalleryOverlay(scene, { storage });
    await overlay.open();

    assert.equal(overlay.isOpen, true);
    assert.equal(overlay.container.visible, true);
    assert.equal(overlay.photos.length, 0);
    assert.ok(overlay.emptyText.visible, 'Empty text must be visible when no photos exist');
    assert.equal(overlay.polaroidCards.length, 0);
});

test('GalleryOverlay calculates 4-grid pagination correctly for 15 photos', async () => {
    const scene = createMockScene();
    const adapter = new MemoryStorageAdapter();
    const storage = new GalleryStorageService({ adapter });

    // Populate 15 photos
    for (let i = 1; i <= 15; i += 1) {
        await storage.savePhoto(VALID_1X1_PNG, {
            id: `photo_${i}`,
            scene: 'HallOfFameScene',
            timestamp: 1725883000000 + i * 1000,
        });
    }

    const overlay = new GalleryOverlay(scene, { storage });
    await overlay.open();

    assert.equal(overlay.photos.length, 15);
    assert.equal(overlay.totalPages, 4, '15 photos / 4 per page = 4 total pages');
    assert.equal(overlay.currentPage, 1);
    assert.equal(overlay.polaroidCards.length, 4, 'Page 1 must render exactly 4 polaroids');

    // Advance to page 2
    overlay.nextPage();
    assert.equal(overlay.currentPage, 2);
    assert.equal(overlay.polaroidCards.length, 4, 'Page 2 must render 4 polaroids');

    // Advance to page 3
    overlay.nextPage();
    assert.equal(overlay.currentPage, 3);
    assert.equal(overlay.polaroidCards.length, 4, 'Page 3 must render 4 polaroids');

    // Advance to page 4
    overlay.nextPage();
    assert.equal(overlay.currentPage, 4);
    assert.equal(overlay.polaroidCards.length, 3, 'Page 4 must render remaining 3 polaroids');

    // Next page at boundary stays clamped at page 4
    overlay.nextPage();
    assert.equal(overlay.currentPage, 4);

    // Prev page returns to page 3
    overlay.prevPage();
    assert.equal(overlay.currentPage, 3);
});

test('clicking a polaroid card opens the detail modal with 16:9 widescreen photo', async () => {
    const scene = createMockScene();
    const adapter = new MemoryStorageAdapter();
    const storage = new GalleryStorageService({ adapter });

    await storage.savePhoto(VALID_1X1_PNG, { id: 'photo_test_1', scene: 'HallOfFameScene', timestamp: 1725883200000 });
    await storage.savePhoto(VALID_1X1_PNG, { id: 'photo_test_2', scene: 'StreetScene', timestamp: 1725883205000 });

    const overlay = new GalleryOverlay(scene, { storage });
    await overlay.open();

    assert.equal(overlay.detailContainer.visible, false, 'Detail modal initially hidden');
    assert.equal(overlay.detailFrameImage, undefined, 'Detail Polaroid frame must not exist (no square squashing)');

    // Click first card
    const card0 = overlay.polaroidCards[0];
    assert.ok(card0, 'Card 0 must exist');
    card0.container.emit('pointerdown');

    assert.equal(overlay.detailContainer.visible, true, 'Detail modal becomes visible on card click');
    assert.ok(overlay.currentDetailPhoto, 'Detail photo must be set');
    assert.equal(overlay.currentDetailPhoto.id, 'photo_test_2', 'Newest photo is first');
    assert.equal(overlay.detailPhotoImage.width, 1152, 'Detail photo width must be 1152 (16:9)');
    assert.equal(overlay.detailPhotoImage.height, 648, 'Detail photo height must be 648 (16:9)');

    // Navigate to next photo in detail view
    overlay.nextDetailPhoto();
    assert.equal(overlay.currentDetailPhoto.id, 'photo_test_1');

    // Close detail view via back button
    overlay.closeDetailView();
    assert.equal(overlay.detailContainer.visible, false);
});

test('detail modal delete button removes photo and refreshes grid', async () => {
    const scene = createMockScene();
    const adapter = new MemoryStorageAdapter();
    const storage = new GalleryStorageService({ adapter });

    await storage.savePhoto(VALID_1X1_PNG, { id: 'photo_delete_me', scene: 'HallOfFameScene' });

    const overlay = new GalleryOverlay(scene, { storage });
    await overlay.open();
    assert.equal(overlay.photos.length, 1);

    // Open detail
    overlay.openDetailView(overlay.photos[0]);
    assert.equal(overlay.detailContainer.visible, true);

    // Delete photo
    await overlay.deleteCurrentDetailPhoto();
    assert.equal(overlay.photos.length, 0);
    assert.equal(overlay.detailContainer.visible, false);
    assert.ok(overlay.emptyText.visible, 'Empty text shows after last photo deleted');
});

test('close method and ESC key close the overlay, clean up cards, and trigger onClose callback', async () => {
    const scene = createMockScene();
    const adapter = new MemoryStorageAdapter();
    const storage = new GalleryStorageService({ adapter });
    let closeCalled = false;

    await storage.savePhoto(VALID_1X1_PNG, { id: 'photo_close_test', scene: 'HallOfFameScene' });

    const overlay = new GalleryOverlay(scene, {
        storage,
        onClose: () => { closeCalled = true; },
    });

    await overlay.open();
    assert.equal(overlay.isOpen, true);
    assert.equal(overlay.polaroidCards.length, 1);

    // Press ESC
    scene.input.keyboard.emit('keydown-ESC');
    assert.equal(overlay.isOpen, false);
    assert.equal(overlay.container.visible, false);
    assert.equal(overlay.polaroidCards.length, 0, 'Polaroid cards must be destroyed on close');
    assert.equal(closeCalled, true);
});

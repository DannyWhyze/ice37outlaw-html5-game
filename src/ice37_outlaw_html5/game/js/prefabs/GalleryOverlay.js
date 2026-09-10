(function attachGalleryOverlayPrefab(globalScope) {
    'use strict';

    const PHOTOS_PER_PAGE = 4;
    const GRID_COLS = 2;
    const GRID_ROWS = 2;

    // Organic rotation tilts for each of the 4 card positions
    const CARD_TILTS = Object.freeze([-1.8, 1.5, 1.2, -1.4]);

    function createSafeText(scene, x, y, content = '', style = {}) {
        if (scene && scene.add && typeof scene.add.text === 'function') {
            return scene.add.text(x, y, content, style);
        }
        return {
            x, y, text: content, visible: true, alpha: 1,
            originX: 0.5, originY: 0.5,
            setOrigin(ox = 0.5, oy = 0.5) { this.originX = ox; this.originY = oy; return this; },
            setVisible(v) { this.visible = v; return this; },
            setText(t) { this.text = t; return this; },
            setColor(c) { this.color = c; return this; },
            setAlpha(a) { this.alpha = a; return this; },
        };
    }

    class GalleryOverlay {
        constructor(scene, options = {}) {
            this.scene = scene;
            this.callbacks = options;
            this.storage = options.storage || (
                (typeof GalleryStorage !== 'undefined' && GalleryStorage.GalleryStorageService)
                    ? new GalleryStorage.GalleryStorageService()
                    : null
            );

            this.isOpen = false;
            this.photos = [];
            this.currentPage = 1;
            this.totalPages = 1;
            this.polaroidCards = [];
            this.currentDetailPhoto = null;
            this.detailIndex = -1;

            // Main container at depth 250 (above scenes & camera hud, below cursor at depth 300)
            this.container = scene.add.container(0, 0)
                .setDepth(250)
                .setVisible(false);

            // 1. Semi-transparent backdrop dimmer over game scene
            if (scene.add && typeof scene.add.rectangle === 'function') {
                this.dimmer = scene.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.85);
                if (typeof this.dimmer.setInteractive === 'function') {
                    this.dimmer.setInteractive(); // Blocks click-through to game scene
                }
                this.container.add(this.dimmer);
            }

            // 2. Central Fotowand Board (16:9 Widescreen ICE37)
            this.backdropImage = scene.add.image(960, 540, 'gallery_backdrop_ice37')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(1672, 941);
            this.container.add(this.backdropImage);

            // 3. Top-Right Close [X] Button
            this.closeButton = scene.add.image(1670, 105, 'hud_camera_close')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(140, 72)
                .setInteractive();
            this.closeButton.on('pointerdown', () => {
                this.playSound('sfx_can_select');
                this.close();
            });
            this.closeButton.on('pointerover', () => {
                this.closeButton.setScale(1.06);
            });
            this.closeButton.on('pointerout', () => {
                this.closeButton.setScale(1.0);
            });
            this.container.add(this.closeButton);

            // 4. Empty State Text
            this.emptyText = createSafeText(scene, 770, 490, 'No photos available.\nGrab the camera and take your first photo!', {
                fontFamily: "'Typist', monospace",
                fontSize: '24px',
                color: '#cccccc',
                align: 'center',
                lineSpacing: 10,
            });
            if (this.emptyText.setOrigin) this.emptyText.setOrigin(0.5, 0.5);
            if (this.emptyText.setVisible) this.emptyText.setVisible(false);
            this.container.add(this.emptyText);

            // 5. Grid Container for the 6 Polaroids
            this.gridContainer = scene.add.container(0, 0);
            this.container.add(this.gridContainer);

            // 6. Pagination Bar (Bottom sidewalk area: X = 770, Y = 885)
            this.paginationContainer = scene.add.container(770, 885);

            // Previous Button
            this.prevBtn = this.createButton(scene, -140, 0, '[ < Prev ]', () => {
                this.prevPage();
            });
            this.paginationContainer.add(this.prevBtn.container);

            // Page Number Indicator
            this.pageText = createSafeText(scene, 0, 0, 'Page 1 of 1', {
                fontFamily: "'Typist', monospace",
                fontSize: '20px',
                color: '#ffffff',
            });
            if (this.pageText.setOrigin) this.pageText.setOrigin(0.5, 0.5);
            this.paginationContainer.add(this.pageText);

            // Next Button
            this.nextBtn = this.createButton(scene, 140, 0, '[ Next > ]', () => {
                this.nextPage();
            });
            this.paginationContainer.add(this.nextBtn.container);

            this.container.add(this.paginationContainer);

            // 7. Detail View Modal Container (Depth 260)
            this.createDetailModal(scene);

            // ESC key listener
            if (this.scene && this.scene.input && this.scene.input.keyboard && typeof this.scene.input.keyboard.on === 'function') {
                this.scene.input.keyboard.on('keydown-ESC', () => {
                    if (this.isOpen) {
                        if (this.detailContainer && this.detailContainer.visible) {
                            this.closeDetailView();
                        } else {
                            this.close();
                        }
                    }
                });
            }
        }

        playSound(key) {
            const SoundHelper = (typeof SoundFx !== 'undefined')
                ? SoundFx
                : (typeof require !== 'undefined' ? require('../logic/soundFx.js') : null);
            if (SoundHelper && typeof SoundHelper.play === 'function' && this.scene) {
                SoundHelper.play(this.scene, key);
            }
        }

        createButton(scene, x, y, label, onClick, customWidth = 110) {
            const width = customWidth;
            const height = 36;
            const bg = (scene.add && typeof scene.add.rectangle === 'function')
                ? scene.add.rectangle(0, 0, width, height, 0x000000, 0.75).setOrigin(0.5, 0.5)
                : null;
            if (bg && typeof bg.setStrokeStyle === 'function') {
                bg.setStrokeStyle(1.5, 0xffffff, 0.5);
            }

            const text = (scene.add && typeof scene.add.text === 'function')
                ? scene.add.text(0, 0, label, {
                    fontFamily: "'Typist', monospace",
                    fontSize: '18px',
                    color: '#ffffff',
                }).setOrigin(0.5, 0.5)
                : { setText() { return this; }, setAlpha() { return this; } };

            const btn = scene.add.container(x, y);
            if (bg) btn.add(bg);
            if (text) btn.add(text);

            btn.setSize(width, height);
            btn.setInteractive();
            btn.on('pointerdown', () => {
                this.playSound('sfx_can_select');
                if (onClick) onClick();
            });
            btn.on('pointerover', () => {
                if (bg) bg.fillColor = 0xffcc00;
                if (text && text.setColor) text.setColor('#111111');
            });
            btn.on('pointerout', () => {
                if (bg) bg.fillColor = 0x000000;
                if (text && text.setColor) text.setColor('#ffffff');
            });

            return { container: btn, bg, text };
        }

        createDetailModal(scene) {
            this.detailContainer = scene.add.container(0, 0).setVisible(false);

            // Modal Dimmer
            if (scene.add && typeof scene.add.rectangle === 'function') {
                const detailDimmer = scene.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.90);
                if (typeof detailDimmer.setInteractive === 'function') {
                    detailDimmer.setInteractive();
                }
                this.detailContainer.add(detailDimmer);
            }

            // Large 16:9 Widescreen Photo Container (Centered at 960, 420)
            this.detailCard = scene.add.container(960, 420);

            // Backing Exhibition Frame (16:9 border with white outline)
            if (scene.add && typeof scene.add.rectangle === 'function') {
                this.detailBacking = scene.add.rectangle(0, 0, 1164, 660, 0x111111, 0.95).setOrigin(0.5, 0.5);
                if (typeof this.detailBacking.setStrokeStyle === 'function') {
                    this.detailBacking.setStrokeStyle(3, 0xffffff, 0.9);
                }
                this.detailCard.add(this.detailBacking);
            }

            // 16:9 Widescreen Photo (1152 x 648 px, un-distorted)
            this.detailPhotoImage = scene.add.image(0, 0, 'gallery_backdrop_ice37')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(1152, 648);
            this.detailCard.add(this.detailPhotoImage);

            // Caption Text below 16:9 Photo
            this.detailCaptionText = createSafeText(scene, 0, 360, '', {
                fontFamily: "'Typist', monospace",
                fontSize: '22px',
                color: '#ffffff',
            });
            if (this.detailCaptionText.setOrigin) {
                this.detailCaptionText.setOrigin(0.5, 0.5);
            }
            this.detailCard.add(this.detailCaptionText);

            this.detailContainer.add(this.detailCard);

            // Action Buttons Bar (Y = 855)
            const actionsBar = scene.add.container(960, 855);

            // 1. Previous Photo [ < ]
            this.detailPrevBtn = this.createButton(scene, -290, 0, '[ < ]', () => {
                this.prevDetailPhoto();
            }, 60);
            actionsBar.add(this.detailPrevBtn.container);

            // 2. Next Photo [ > ]
            this.detailNextBtn = this.createButton(scene, -210, 0, '[ > ]', () => {
                this.nextDetailPhoto();
            }, 60);
            actionsBar.add(this.detailNextBtn.container);

            // 3. Download Button
            this.detailDownloadBtn = this.createButton(scene, -90, 0, '[ Download ]', () => {
                this.downloadCurrentDetailPhoto();
            }, 130);
            actionsBar.add(this.detailDownloadBtn.container);

            // 4. Delete Button
            this.detailDeleteBtn = this.createButton(scene, 50, 0, '[ Delete ]', () => {
                this.deleteCurrentDetailPhoto();
            }, 110);
            actionsBar.add(this.detailDeleteBtn.container);

            // 5. Cut Tool Placeholder (Disabled)
            this.detailCutBtn = this.createButton(scene, 170, 0, '[ Cut ]', null, 90);
            if (this.detailCutBtn.container) {
                this.detailCutBtn.container.setAlpha(0.4);
                this.detailCutBtn.container.disableInteractive();
            }
            actionsBar.add(this.detailCutBtn.container);

            // 6. Back Button [ Back ]
            this.detailBackBtn = this.createButton(scene, 285, 0, '[ Back ]', () => {
                this.closeDetailView();
            }, 110);
            actionsBar.add(this.detailBackBtn.container);

            this.detailContainer.add(actionsBar);
            this.container.add(this.detailContainer);
        }

        async open() {
            this.isOpen = true;
            this.container.setVisible(true);
            this.closeDetailView();

            if (this.scene) {
                if (this.scene.toolCursor && typeof this.scene.toolCursor.setDepth === 'function') {
                    this.previousCursorDepth = this.scene.toolCursor.depth;
                    this.scene.toolCursor.setDepth(300);
                }
                if (typeof this.scene.setActiveCursor === 'function') {
                    this.previousCursorType = this.scene.activeCursorType || 'can';
                    this.scene.setActiveCursor('hand');
                }
            }

            await this.refreshPhotos();

            if (this.callbacks.onOpen) {
                this.callbacks.onOpen();
            }
            return this;
        }

        close() {
            this.isOpen = false;
            this.container.setVisible(false);
            this.closeDetailView();

            // Destroy all cards so no orphaned card containers leak to the scene display list
            if (this.gridContainer && typeof this.gridContainer.removeAll === 'function') {
                this.gridContainer.removeAll(true);
            }
            this.polaroidCards = [];

            if (this.scene) {
                if (typeof this.scene.setActiveCursor === 'function' && this.previousCursorType) {
                    this.scene.setActiveCursor(this.previousCursorType);
                }
                if (this.scene.toolCursor && typeof this.previousCursorDepth === 'number' && typeof this.scene.toolCursor.setDepth === 'function') {
                    this.scene.toolCursor.setDepth(this.previousCursorDepth);
                }
            }

            if (this.callbacks.onClose) {
                this.callbacks.onClose();
            }
            return this;
        }

        async refreshPhotos() {
            if (this.storage && typeof this.storage.listPhotos === 'function') {
                this.photos = await this.storage.listPhotos();
            } else {
                this.photos = [];
            }

            this.totalPages = Math.max(1, Math.ceil(this.photos.length / PHOTOS_PER_PAGE));
            if (this.currentPage > this.totalPages) {
                this.currentPage = this.totalPages;
            }
            this.renderCurrentPage();
        }

        renderCurrentPage() {
            // Clear existing grid cards and destroy previous children completely
            if (this.gridContainer && typeof this.gridContainer.removeAll === 'function') {
                this.gridContainer.removeAll(true);
            }
            this.polaroidCards = [];

            if (this.photos.length === 0) {
                this.emptyText.setVisible(true);
                this.paginationContainer.setVisible(false);
                return;
            }

            this.emptyText.setVisible(false);
            this.paginationContainer.setVisible(this.totalPages > 1);
            if (this.pageText) {
                this.pageText.setText(`Page ${this.currentPage} of ${this.totalPages}`);
            }

            // Pagination button alpha states
            if (this.prevBtn && this.prevBtn.container) {
                const canPrev = this.currentPage > 1;
                this.prevBtn.container.setAlpha(canPrev ? 1.0 : 0.35);
            }
            if (this.nextBtn && this.nextBtn.container) {
                const canNext = this.currentPage < this.totalPages;
                this.nextBtn.container.setAlpha(canNext ? 1.0 : 0.35);
            }

            const startIndex = (this.currentPage - 1) * PHOTOS_PER_PAGE;
            const pagePhotos = this.photos.slice(startIndex, startIndex + PHOTOS_PER_PAGE);

            // Wall grid bounds: 2 columns x 2 rows (4 photos per page)
            // Center X is 770, columns at X = 585, 955 (spacing 370px, width 340px)
            // Rows at Y = 310, 675 (spacing 365px, height 355px)
            const colX = [585, 955];
            const rowY = [310, 675];
            const cardWidth = 340;
            const cardHeight = 355;

            for (let i = 0; i < pagePhotos.length; i += 1) {
                const photo = pagePhotos[i];
                const col = i % GRID_COLS;
                const row = Math.floor(i / GRID_COLS);
                const x = colX[col];
                const y = rowY[row];
                const tilt = CARD_TILTS[i] || 0;

                const card = this.createPolaroidCard(photo, x, y, cardWidth, cardHeight, tilt);
                this.polaroidCards.push(card);
                this.gridContainer.add(card.container);
            }
        }

        createPolaroidCard(photo, x, y, width, height, tilt) {
            const scene = this.scene;
            const cardContainer = scene.add.container(x, y);
            cardContainer.setAngle(tilt);

            // 0. Solid dark aperture backing (prevents empty/transparent bleeding)
            const photoW = width * 0.755;
            const photoH = height * 0.662;
            const photoY = -height * 0.08;

            if (scene.add && typeof scene.add.rectangle === 'function') {
                const apertureBacking = scene.add.rectangle(0, photoY, photoW, photoH, 0x111111, 1.0)
                    .setOrigin(0.5, 0.5);
                cardContainer.add(apertureBacking);
            }

            // 1. Photo inside Aperture (Width ~0.755 of frame, Height ~0.662, Y shifted up)
            let photoImg = null;
            if (scene.add && typeof scene.add.image === 'function') {
                photoImg = scene.add.image(0, photoY, 'gallery_backdrop_ice37')
                    .setOrigin(0.5, 0.5)
                    .setDisplaySize(photoW, photoH)
                    .setVisible(false);
                cardContainer.add(photoImg);
            }

            const initialKey = this.getPhotoTextureKey(photo, (readyKey) => {
                if (photoImg && photoImg.active !== false && typeof photoImg.setTexture === 'function') {
                    photoImg.setTexture(readyKey);
                    photoImg.setDisplaySize(photoW, photoH);
                    photoImg.setVisible(true);
                }
            });
            if (initialKey && photoImg) {
                photoImg.setTexture(initialKey);
                photoImg.setDisplaySize(photoW, photoH);
                photoImg.setVisible(true);
            }

            // 2. Comic Polaroid Frame on top
            const frameImg = scene.add.image(0, 0, 'gallery_polaroid_frame')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(width, height);
            cardContainer.add(frameImg);

            // 3. Caption Text on chin
            const caption = this.formatDateCaption(photo.metadata);
            const labelText = createSafeText(scene, 0, height * 0.38, caption, {
                fontFamily: "'Typist', monospace",
                fontSize: '15px',
                color: '#222222',
            });
            if (labelText.setOrigin) {
                labelText.setOrigin(0.5, 0.5);
            }
            cardContainer.add(labelText);

            cardContainer.setSize(width, height);
            cardContainer.setInteractive();

            // Hover tilt straightening & subtle lift
            cardContainer.on('pointerover', () => {
                if (scene.tweens && typeof scene.tweens.add === 'function') {
                    scene.tweens.add({
                        targets: cardContainer,
                        angle: 0,
                        scaleX: 1.05,
                        scaleY: 1.05,
                        duration: 100,
                        ease: 'Power1',
                    });
                } else {
                    cardContainer.setAngle(0);
                    cardContainer.setScale(1.05);
                }
            });

            cardContainer.on('pointerout', () => {
                if (scene.tweens && typeof scene.tweens.add === 'function') {
                    scene.tweens.add({
                        targets: cardContainer,
                        angle: tilt,
                        scaleX: 1.0,
                        scaleY: 1.0,
                        duration: 100,
                        ease: 'Power1',
                    });
                } else {
                    cardContainer.setAngle(tilt);
                    cardContainer.setScale(1.0);
                }
            });

            cardContainer.on('pointerdown', () => {
                this.playSound('sfx_can_select');
                this.openDetailView(photo);
            });

            return {
                container: cardContainer,
                photo,
                frameImg,
                photoImg,
                labelText,
            };
        }

        getPhotoTextureKey(photo, onTextureReady) {
            if (!photo) return null;
            const key = `gallery_tex_${photo.id}`;
            if (photo.textureKey && this.scene.textures && this.scene.textures.exists(photo.textureKey)) {
                return photo.textureKey;
            }
            if (photo.id && this.scene.textures && this.scene.textures.exists(key)) {
                return key;
            }
            const srcUrl = photo.dataUrl || photo.imageUrl;
            if (srcUrl && typeof Image !== 'undefined') {
                const img = new Image();
                img.onload = () => {
                    if (this.scene && this.scene.textures) {
                        if (this.scene.textures.exists(key)) {
                            this.scene.textures.remove(key);
                        }
                        this.scene.textures.addImage(key, img);
                        photo.textureKey = key;
                        if (typeof onTextureReady === 'function') {
                            onTextureReady(key);
                        }
                    }
                };
                img.src = srcUrl;
            } else if (photo.dataUrl && this.scene.textures && typeof this.scene.textures.addBase64 === 'function') {
                this.scene.textures.addBase64(key, photo.dataUrl);
                photo.textureKey = key;
                return key;
            }
            return null;
        }

        formatDateCaption(metadata = {}) {
            const sceneName = (metadata.scene || 'HALL OF FAME')
                .replace('Scene', '')
                .toUpperCase();
            const date = metadata.timestamp ? new Date(metadata.timestamp) : new Date();
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${sceneName} • ${day}.${month}.${year}`;
        }

        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage += 1;
                this.renderCurrentPage();
            }
        }

        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage -= 1;
                this.renderCurrentPage();
            }
        }

        openDetailView(photo) {
            this.currentDetailPhoto = photo;
            this.detailIndex = this.photos.findIndex(p => p.id === photo.id);
            this.detailContainer.setVisible(true);

            const detailW = 1152;
            const detailH = 648;
            if (this.detailPhotoImage && typeof this.detailPhotoImage.setVisible === 'function') {
                this.detailPhotoImage.setVisible(false);
            }
            const initialKey = this.getPhotoTextureKey(photo, (readyKey) => {
                if (this.detailPhotoImage && this.detailPhotoImage.active !== false && typeof this.detailPhotoImage.setTexture === 'function') {
                    this.detailPhotoImage.setTexture(readyKey);
                    this.detailPhotoImage.setDisplaySize(detailW, detailH);
                    this.detailPhotoImage.setVisible(true);
                }
            });
            if (initialKey && this.detailPhotoImage && typeof this.detailPhotoImage.setTexture === 'function') {
                this.detailPhotoImage.setTexture(initialKey);
                this.detailPhotoImage.setDisplaySize(detailW, detailH);
                this.detailPhotoImage.setVisible(true);
            }
            if (this.detailCaptionText && typeof this.detailCaptionText.setText === 'function') {
                this.detailCaptionText.setText(this.formatDateCaption(photo.metadata));
            }

            this.updateDetailNavButtons();
        }

        closeDetailView() {
            if (this.detailContainer) {
                this.detailContainer.setVisible(false);
            }
            this.currentDetailPhoto = null;
            this.detailIndex = -1;
        }

        nextDetailPhoto() {
            if (this.detailIndex < this.photos.length - 1) {
                this.detailIndex += 1;
                this.openDetailView(this.photos[this.detailIndex]);
            }
        }

        prevDetailPhoto() {
            if (this.detailIndex > 0) {
                this.detailIndex -= 1;
                this.openDetailView(this.photos[this.detailIndex]);
            }
        }

        updateDetailNavButtons() {
            if (this.detailPrevBtn && this.detailPrevBtn.container) {
                this.detailPrevBtn.container.setAlpha(this.detailIndex > 0 ? 1.0 : 0.35);
            }
            if (this.detailNextBtn && this.detailNextBtn.container) {
                this.detailNextBtn.container.setAlpha(this.detailIndex < this.photos.length - 1 ? 1.0 : 0.35);
            }
        }

        downloadCurrentDetailPhoto() {
            if (!this.currentDetailPhoto || !this.storage) return;
            const photo = this.currentDetailPhoto;
            const filename = `${photo.id || 'photo'}.png`;
            if (typeof this.storage.downloadPhoto === 'function') {
                this.storage.downloadPhoto(photo.dataUrl || photo.imageUrl, filename);
            }
        }

        async deleteCurrentDetailPhoto() {
            if (!this.currentDetailPhoto || !this.storage) return;
            const photoId = this.currentDetailPhoto.id;
            await this.storage.deletePhoto(photoId);
            this.closeDetailView();
            await this.refreshPhotos();
        }
    }

    const exported = { GalleryOverlay };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exported;
    }
    if (globalScope) {
        globalScope.GalleryOverlay = GalleryOverlay;
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

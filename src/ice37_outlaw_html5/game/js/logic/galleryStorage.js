(function attachGalleryStorage(globalScope) {
    'use strict';

    // Official 8-byte PNG file signature (magic bytes)
    const PNG_SIGNATURE = Object.freeze([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5.0 MB payload limit
    const MAX_PHOTOS_QUOTA = 50; // Quota cap per storage
    const ALLOWED_SCENES = Object.freeze(['HallOfFameScene', 'StreetScene', 'TrainyardScene']);

    /**
     * Decode a base64 string into a byte array.
     * Works in both Browser and Node.js environments.
     */
    function decodeBase64ToBytes(base64Str) {
        if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
            return Buffer.from(base64Str, 'base64');
        }
        if (typeof atob === 'function') {
            const binaryStr = atob(base64Str);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i += 1) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            return bytes;
        }
        throw new Error('No base64 decoder available in runtime');
    }

    /**
     * Defense-in-Depth validation of a PNG Data URL:
     * 1. Validates MIME prefix ('data:image/png;base64,')
     * 2. Checks raw byte size against MAX_PAYLOAD_BYTES (5MB)
     * 3. Verifies official 8-byte PNG magic header
     */
    function validatePngDataUrl(dataUrl) {
        if (typeof dataUrl !== 'string') {
            return { valid: false, error: 'Data URL must be a string' };
        }

        const prefix = 'data:image/png;base64,';
        if (!dataUrl.startsWith(prefix)) {
            return { valid: false, error: 'Invalid MIME type: must be data:image/png;base64,' };
        }

        const base64Data = dataUrl.slice(prefix.length).trim();
        // Estimated byte size of base64 data: ceil(len * 3 / 4)
        const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
        if (estimatedBytes > MAX_PAYLOAD_BYTES) {
            return {
                valid: false,
                error: `Payload exceeds 5MB limit: ${estimatedBytes} bytes > ${MAX_PAYLOAD_BYTES} bytes`,
            };
        }

        // We need at least the first 8 bytes (12 base64 characters) to verify the PNG signature
        if (base64Data.length < 12) {
            return { valid: false, error: 'Payload too short to contain valid PNG header' };
        }

        try {
            const headerSample = base64Data.slice(0, 16);
            const decodedBytes = decodeBase64ToBytes(headerSample);
            const magicBytes = [];
            for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
                magicBytes.push(decodedBytes[i]);
                if (decodedBytes[i] !== PNG_SIGNATURE[i]) {
                    return {
                        valid: false,
                        error: `Invalid PNG signature at byte ${i}: expected 0x${PNG_SIGNATURE[i].toString(16)}, got 0x${(decodedBytes[i] || 0).toString(16)}`,
                    };
                }
            }

            return {
                valid: true,
                byteLength: estimatedBytes,
                magicBytes,
            };
        } catch (err) {
            return { valid: false, error: `Base64 decoding failed: ${err.message}` };
        }
    }

    /**
     * Sanitizes a photo ID to strictly alphanumeric characters, underscores and dashes.
     * Replaces any path traversal characters (../, ..\, /) to prevent file system traversal.
     */
    function sanitizePhotoId(rawId) {
        if (typeof rawId !== 'string' || !rawId.trim()) {
            return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        }
        // Strip path traversal dots, slashes, backslashes and illegal chars
        const sanitized = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
        return sanitized || `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    /**
     * Strictly validates the metadata schema against allowed scenes, zoom ranges, and types.
     */
    function validateMetadata(meta) {
        if (!meta || typeof meta !== 'object') {
            return { valid: false, error: 'Metadata must be an object' };
        }

        if (meta.scene && !ALLOWED_SCENES.includes(meta.scene)) {
            return { valid: false, error: `Invalid scene: ${meta.scene}. Allowed: ${ALLOWED_SCENES.join(', ')}` };
        }

        if (meta.zoom !== undefined) {
            const zoomNum = Number(meta.zoom);
            if (Number.isNaN(zoomNum) || zoomNum < 1.0 || zoomNum > 2.5) {
                return { valid: false, error: `Invalid zoom level: ${meta.zoom}. Range: [1.0, 2.5]` };
            }
        }

        if (meta.timestamp !== undefined) {
            const timeNum = Number(meta.timestamp);
            if (Number.isNaN(timeNum) || timeNum <= 0) {
                return { valid: false, error: `Invalid timestamp: ${meta.timestamp}` };
            }
        }

        return { valid: true };
    }

    /**
     * In-Memory Storage Adapter (used for tests and ephemeral environments).
     */
    class MemoryStorageAdapter {
        constructor(options = {}) {
            this.maxPhotos = options.maxPhotos || MAX_PHOTOS_QUOTA;
            this.photos = new Map();
            this.seq = 0;
        }

        async savePhoto(dataUrl, metadata = {}) {
            const id = sanitizePhotoId(metadata.id);
            this.seq += 1;
            const item = {
                id,
                dataUrl,
                metadata: {
                    id,
                    timestamp: metadata.timestamp || Date.now(),
                    seq: this.seq,
                    scene: metadata.scene || 'HallOfFameScene',
                    zoom: metadata.zoom || 1.0,
                    ...metadata,
                },
            };

            // Prune oldest if quota is reached
            if (this.photos.size >= this.maxPhotos && !this.photos.has(id)) {
                const oldestKey = this.photos.keys().next().value;
                this.photos.delete(oldestKey);
            }

            this.photos.set(id, item);
            return item;
        }

        async listPhotos() {
            // Return newest first (timestamp, with sequence tie-breaker)
            const list = Array.from(this.photos.values());
            return list.sort((a, b) => (
                (b.metadata.timestamp - a.metadata.timestamp) ||
                ((b.metadata.seq || 0) - (a.metadata.seq || 0))
            ));
        }

        async deletePhoto(id) {
            const safeId = sanitizePhotoId(id);
            return this.photos.delete(safeId);
        }

        async getPhoto(id) {
            const safeId = sanitizePhotoId(id);
            return this.photos.get(safeId) || null;
        }
    }

    /**
     * IndexedDB Storage Adapter (for client-side persistence in GitHub Pages).
     */
    class IndexedDBStorageAdapter {
        constructor(options = {}) {
            this.dbName = options.dbName || 'LordsOfBrooklyn_Gallery';
            this.storeName = 'photos';
            this.maxPhotos = options.maxPhotos || MAX_PHOTOS_QUOTA;
            this.dbPromise = null;
        }

        _getDB() {
            if (this.dbPromise) return this.dbPromise;
            if (typeof indexedDB === 'undefined') {
                return Promise.reject(new Error('IndexedDB not supported in environment'));
            }
            this.dbPromise = new Promise((resolve, reject) => {
                const req = indexedDB.open(this.dbName, 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName, { keyPath: 'id' });
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            return this.dbPromise;
        }

        async savePhoto(dataUrl, metadata = {}) {
            const db = await this._getDB();
            const id = sanitizePhotoId(metadata.id);
            const item = {
                id,
                dataUrl,
                metadata: {
                    id,
                    timestamp: metadata.timestamp || Date.now(),
                    scene: metadata.scene || 'HallOfFameScene',
                    zoom: metadata.zoom || 1.0,
                    ...metadata,
                },
            };

            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                store.put(item);
                tx.oncomplete = () => resolve(item);
                tx.onerror = () => reject(tx.error);
            });
        }

        async listPhotos() {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readonly');
                const store = tx.objectStore(this.storeName);
                const req = store.getAll();
                req.onsuccess = () => {
                    const list = req.result || [];
                    list.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
                    resolve(list);
                };
                req.onerror = () => reject(req.error);
            });
        }

        async deletePhoto(id) {
            const db = await this._getDB();
            const safeId = sanitizePhotoId(id);
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                store.delete(safeId);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        }

        async getPhoto(id) {
            const db = await this._getDB();
            const safeId = sanitizePhotoId(id);
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readonly');
                const store = tx.objectStore(this.storeName);
                const req = store.get(safeId);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            });
        }
    }

    /**
     * Local Filesystem Adapter (calls server REST API /api/gallery/photos).
     */
    class LocalFilesystemAdapter {
        constructor(options = {}) {
            this.endpoint = options.endpoint || '/api/gallery/photos';
        }

        async isAvailable() {
            if (typeof fetch === 'undefined') return false;
            try {
                const res = await fetch(`${this.endpoint}/health`, { method: 'GET' });
                return res.ok;
            } catch {
                return false;
            }
        }

        async savePhoto(dataUrl, metadata = {}) {
            const res = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataUrl, metadata }),
            });
            if (!res.ok) {
                throw new Error(`Server failed to save photo: HTTP ${res.status}`);
            }
            return res.json();
        }

        async listPhotos() {
            const res = await fetch(this.endpoint, { method: 'GET' });
            if (!res.ok) {
                throw new Error(`Server failed to list photos: HTTP ${res.status}`);
            }
            return res.json();
        }

        async deletePhoto(id) {
            const safeId = sanitizePhotoId(id);
            const res = await fetch(`${this.endpoint}/${safeId}`, { method: 'DELETE' });
            return res.ok;
        }

        async getPhoto(id) {
            const safeId = sanitizePhotoId(id);
            const res = await fetch(`${this.endpoint}/${safeId}`, { method: 'GET' });
            if (!res.ok) return null;
            return res.json();
        }
    }

    /**
     * Main GalleryStorageService managing input validation, defense-in-depth,
     * and routing to LocalFilesystemAdapter with automatic ClientFallbackAdapter.
     */
    class GalleryStorageService {
        constructor(options = {}) {
            this.adapter = options.adapter || null;
            this.fallbackAdapter = options.fallbackAdapter || (
                typeof indexedDB !== 'undefined'
                    ? new IndexedDBStorageAdapter(options)
                    : new MemoryStorageAdapter(options)
            );
            this.localAdapter = options.localAdapter || new LocalFilesystemAdapter(options);
            this.initialized = false;
        }

        async init() {
            if (this.initialized) return;
            if (!this.adapter) {
                const isLocalServer = await this.localAdapter.isAvailable();
                this.adapter = isLocalServer ? this.localAdapter : this.fallbackAdapter;
            }
            this.initialized = true;
        }

        async savePhoto(dataUrl, metadata = {}) {
            // Defense-in-depth security verification
            const validation = validatePngDataUrl(dataUrl);
            if (!validation.valid) {
                throw new Error(`Security validation failed: ${validation.error}`);
            }

            const metaValidation = validateMetadata(metadata);
            if (!metaValidation.valid) {
                throw new Error(`Metadata validation failed: ${metaValidation.error}`);
            }

            await this.init();
            return this.adapter.savePhoto(dataUrl, metadata);
        }

        async listPhotos() {
            await this.init();
            return this.adapter.listPhotos();
        }

        async deletePhoto(id) {
            await this.init();
            return this.adapter.deletePhoto(id);
        }

        async getPhoto(id) {
            await this.init();
            return this.adapter.getPhoto(id);
        }

        /**
         * Utility to trigger a secure browser file download of a PNG dataUrl.
         */
        downloadPhoto(dataUrl, filename = 'lords_of_brooklyn_photo.png') {
            const validation = validatePngDataUrl(dataUrl);
            if (!validation.valid) {
                throw new Error(`Cannot download invalid PNG: ${validation.error}`);
            }

            const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            if (typeof document !== 'undefined') {
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = safeFilename.endsWith('.png') ? safeFilename : `${safeFilename}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return true;
            }
            return false;
        }
    }

    const exported = {
        PNG_SIGNATURE,
        MAX_PAYLOAD_BYTES,
        MAX_PHOTOS_QUOTA,
        ALLOWED_SCENES,
        validatePngDataUrl,
        validateMetadata,
        sanitizePhotoId,
        MemoryStorageAdapter,
        IndexedDBStorageAdapter,
        LocalFilesystemAdapter,
        GalleryStorageService,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exported;
    }
    if (globalScope) {
        globalScope.GalleryStorage = exported;
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

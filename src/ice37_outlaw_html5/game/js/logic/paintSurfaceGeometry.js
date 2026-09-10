(function attachPaintSurfaceGeometry(globalScope) {
    const DEFAULT_CHUNK_WIDTH = 4096;

    function validateSurfaceBounds(surfaceBounds) {
        if (!surfaceBounds || typeof surfaceBounds !== 'object') {
            throw new Error('Invalid surface bounds: must be an object');
        }
        const { x, y, width, height } = surfaceBounds;
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
            throw new Error('Invalid surface bounds: x, y, width, height must be finite numbers');
        }
        if (width <= 0 || height <= 0) {
            throw new Error('Invalid surface bounds: width and height must be strictly positive');
        }
    }

    function createSurfaceChunks(surfaceBounds, maxTextureSize, preferredChunkWidth = DEFAULT_CHUNK_WIDTH) {
        validateSurfaceBounds(surfaceBounds);

        if (!Number.isFinite(maxTextureSize) || maxTextureSize <= 0) {
            throw new Error('Invalid maxTextureSize: must be a positive number');
        }

        if (surfaceBounds.height > maxTextureSize) {
            throw new Error(`Surface bounds height (${surfaceBounds.height}) exceeds maxTextureSize (${maxTextureSize})`);
        }

        const validPreferred = (Number.isFinite(preferredChunkWidth) && preferredChunkWidth > 0)
            ? preferredChunkWidth
            : DEFAULT_CHUNK_WIDTH;
        const chunkWidth = Math.min(DEFAULT_CHUNK_WIDTH, maxTextureSize, validPreferred);

        const chunks = [];
        let uStart = 0;
        let index = 0;

        while (uStart < surfaceBounds.width) {
            const width = Math.min(chunkWidth, surfaceBounds.width - uStart);
            chunks.push({
                index,
                uStart,
                width,
                height: surfaceBounds.height,
                worldX: surfaceBounds.x + uStart,
                worldY: surfaceBounds.y,
            });
            uStart += width;
            index++;
        }

        return chunks;
    }

    function getStampTargets(surfaceBounds, chunks, worldX, worldY, radius) {
        if (!surfaceBounds || !Array.isArray(chunks)) {
            return [];
        }
        if (!Number.isFinite(worldX) || !Number.isFinite(worldY) || !Number.isFinite(radius) || radius < 0) {
            return [];
        }

        const brushMinX = worldX - radius;
        const brushMaxX = worldX + radius;
        const brushMinY = worldY - radius;
        const brushMaxY = worldY + radius;

        const surfaceMinX = surfaceBounds.x;
        const surfaceMaxX = surfaceBounds.x + surfaceBounds.width;
        const surfaceMinY = surfaceBounds.y;
        const surfaceMaxY = surfaceBounds.y + surfaceBounds.height;

        // Reject if completely outside surface bounds rectangle
        if (brushMaxX < surfaceMinX || brushMinX > surfaceMaxX || brushMaxY < surfaceMinY || brushMinY > surfaceMaxY) {
            return [];
        }

        const targets = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkMinX = chunk.worldX;
            const chunkMaxX = chunk.worldX + chunk.width;

            if (brushMaxX >= chunkMinX && brushMinX <= chunkMaxX) {
                targets.push({
                    chunkIndex: chunk.index,
                    localX: worldX - chunk.worldX,
                    localY: worldY - surfaceBounds.y,
                });
            }
        }

        return targets;
    }

    const api = {
        DEFAULT_CHUNK_WIDTH,
        createSurfaceChunks,
        getStampTargets,
    };

    globalScope.PaintSurfaceGeometry = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));

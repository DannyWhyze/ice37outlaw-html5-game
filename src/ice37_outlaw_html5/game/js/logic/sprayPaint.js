(function attachSprayPaint(globalScope) {
    const NATIVE_SCALE = 1920 / 546;

    function canSpray(isLeaving) {
        return !isLeaving;
    }

    function getNativeCapSize(cap) {
        return cap * NATIVE_SCALE;
    }

    function interpolateSprayStamps(lastPoint, point, cap) {
        const deltaX = point.x - lastPoint.x;
        const deltaY = point.y - lastPoint.y;
        const distance = Math.hypot(deltaX, deltaY);
        const spacing = Math.max(cap * 0.35, 1);
        const stampCount = Math.max(1, Math.ceil(distance / spacing));
        return Array.from({ length: stampCount }, (_, index) => {
            const progress = (index + 1) / stampCount;
            return {
                x: lastPoint.x + deltaX * progress,
                y: lastPoint.y + deltaY * progress,
            };
        });
    }

    function extractPointerPoints(pointer, worldX = 0, canvas = null, scaleManager = null, offsetY = 0) {
        const fallbackX = ((pointer && typeof pointer.x === 'number') ? pointer.x : 0) - worldX;
        const fallbackY = ((pointer && typeof pointer.y === 'number') ? pointer.y : 0) + offsetY;
        const fallbackPoint = { x: fallbackX, y: fallbackY };

        if (!pointer || !pointer.event || typeof pointer.event.getCoalescedEvents !== 'function') {
            return [fallbackPoint];
        }

        const targetScale = scaleManager
            || (pointer && pointer.manager && pointer.manager.scale)
            || (canvas && canvas.scene && canvas.scene.scale)
            || null;

        try {
            const coalesced = pointer.event.getCoalescedEvents();
            if (!coalesced || !coalesced.length) {
                return [fallbackPoint];
            }

            const rect = (canvas && typeof canvas.getBoundingClientRect === 'function')
                ? canvas.getBoundingClientRect()
                : null;
            const scaleX = (rect && rect.width > 0) ? (1920 / rect.width) : 1;
            const scaleY = (rect && rect.height > 0) ? (1080 / rect.height) : 1;
            const left = rect ? rect.left : 0;
            const top = rect ? rect.top : 0;

            const points = [];
            for (let i = 0; i < coalesced.length; i++) {
                const eventItem = coalesced[i];
                let pointX;
                let pointY;

                if (targetScale && typeof targetScale.transformX === 'function' && typeof targetScale.transformY === 'function') {
                    const pageX = (typeof eventItem.pageX === 'number')
                        ? eventItem.pageX
                        : ((typeof eventItem.clientX === 'number') ? eventItem.clientX : 0);
                    const pageY = (typeof eventItem.pageY === 'number')
                        ? eventItem.pageY
                        : ((typeof eventItem.clientY === 'number') ? eventItem.clientY : 0);
                    pointX = targetScale.transformX(pageX) - worldX;
                    pointY = targetScale.transformY(pageY) + offsetY;
                } else {
                    const clientX = (eventItem && typeof eventItem.clientX === 'number')
                        ? eventItem.clientX
                        : ((eventItem && typeof eventItem.x === 'number') ? eventItem.x : 0);
                    const clientY = (eventItem && typeof eventItem.clientY === 'number')
                        ? eventItem.clientY
                        : ((eventItem && typeof eventItem.y === 'number') ? eventItem.y : 0);

                    pointX = ((clientX - left) * scaleX) - worldX;
                    pointY = ((clientY - top) * scaleY) + offsetY;
                }

                if (points.length > 0) {
                    const last = points[points.length - 1];
                    const dist = Math.hypot(pointX - last.x, pointY - last.y);
                    if (dist < 1.5) {
                        continue;
                    }
                }
                points.push({ x: pointX, y: pointY });
            }

            return points.length > 0 ? points : [fallbackPoint];
        } catch (_) {
            return [fallbackPoint];
        }
    }

    class SprayStroke {
        constructor(startPoint, cap) {
            this.points = (startPoint && typeof startPoint.x === 'number') ? [startPoint] : [];
            this.lastMidPoint = null;
            this.cap = cap;
            this.hasStarted = false;
            this.spacing = Math.max(cap * 0.35, 1);
        }

        addPoints(newPoints) {
            if (!Array.isArray(newPoints) || newPoints.length === 0) {
                return [];
            }
            for (let i = 0; i < newPoints.length; i++) {
                const pt = newPoints[i];
                if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
                    this.points.push(pt);
                }
            }

            const stamps = [];
            while (this.points.length >= 3) {
                const p0 = this.points[0];
                const p1 = this.points[1];
                const p2 = this.points[2];

                const v1x = p1.x - p0.x;
                const v1y = p1.y - p0.y;
                const v2x = p2.x - p1.x;
                const v2y = p2.y - p1.y;

                const l1 = Math.hypot(v1x, v1y);
                const l2 = Math.hypot(v2x, v2y);

                if (l1 < 0.001) {
                    this.points.shift();
                    continue;
                }
                if (l2 < 0.001) {
                    this.points.splice(1, 1);
                    continue;
                }

                let m0;
                if (!this.hasStarted) {
                    m0 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
                    const startSegment = interpolateSprayStamps(p0, m0, this.cap);
                    for (let s = 0; s < startSegment.length; s++) {
                        stamps.push(startSegment[s]);
                    }
                    this.lastMidPoint = m0;
                    this.hasStarted = true;
                } else {
                    m0 = this.lastMidPoint;
                }

                const m1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                const dot = (v1x * v2x) + (v1y * v2y);
                const cosTheta = dot / (l1 * l2);

                // Sharp corner detection: deflection angle > 70 deg (interior angle < 110 deg)
                if (cosTheta < 0.342) {
                    const seg1 = interpolateSprayStamps(m0, p1, this.cap);
                    for (let s = 0; s < seg1.length; s++) {
                        stamps.push(seg1[s]);
                    }
                    const seg2 = interpolateSprayStamps(p1, m1, this.cap);
                    for (let s = 0; s < seg2.length; s++) {
                        stamps.push(seg2[s]);
                    }
                } else {
                    const chord1 = Math.hypot(p1.x - m0.x, p1.y - m0.y);
                    const chord2 = Math.hypot(m1.x - p1.x, m1.y - p1.y);
                    const direct = Math.hypot(m1.x - m0.x, m1.y - m0.y);
                    const arcApprox = (chord1 + chord2 + direct) / 2;
                    const steps = Math.max(1, Math.ceil(arcApprox / this.spacing));

                    for (let k = 1; k <= steps; k++) {
                        const t = k / steps;
                        const omt = 1 - t;
                        const bx = (omt * omt * m0.x) + (2 * omt * t * p1.x) + (t * t * m1.x);
                        const by = (omt * omt * m0.y) + (2 * omt * t * p1.y) + (t * t * m1.y);
                        stamps.push({ x: bx, y: by });
                    }
                }

                this.lastMidPoint = m1;
                this.points.shift();
            }

            return stamps;
        }

        finish() {
            const finalStamps = [];
            if (this.lastMidPoint !== null && this.points.length > 0) {
                const pEnd = this.points[this.points.length - 1];
                const endSegment = interpolateSprayStamps(this.lastMidPoint, pEnd, this.cap);
                for (let s = 0; s < endSegment.length; s++) {
                    finalStamps.push(endSegment[s]);
                }
            } else if (this.lastMidPoint === null && this.points.length >= 2) {
                const p0 = this.points[0];
                const pEnd = this.points[this.points.length - 1];
                const endSegment = interpolateSprayStamps(p0, pEnd, this.cap);
                for (let s = 0; s < endSegment.length; s++) {
                    finalStamps.push(endSegment[s]);
                }
            }
            this.points = [];
            this.lastMidPoint = null;
            return finalStamps;
        }
    }

    function createStroke(startPoint, cap) {
        return new SprayStroke(startPoint, cap);
    }

    const api = {
        NATIVE_SCALE,
        canSpray,
        getNativeCapSize,
        interpolateSprayStamps,
        extractPointerPoints,
        SprayStroke,
        createStroke,
    };
    globalScope.SprayPaint = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));

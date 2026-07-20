(function exposeCaptionGeometry(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.CaptionGeometry = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildCaptionGeometry() {
    function round(value) {
        return Math.round(value * 1000) / 1000;
    }

    function getContainedFrame(wrapperWidth, wrapperHeight, videoWidth, videoHeight) {
        const safeWrapperWidth = Math.max(0, Number(wrapperWidth) || 0);
        const safeWrapperHeight = Math.max(0, Number(wrapperHeight) || 0);
        const safeVideoWidth = Math.max(0, Number(videoWidth) || 0);
        const safeVideoHeight = Math.max(0, Number(videoHeight) || 0);

        if (!safeWrapperWidth || !safeWrapperHeight || !safeVideoWidth || !safeVideoHeight) {
            return { left: 0, top: 0, width: safeWrapperWidth, height: safeWrapperHeight };
        }

        const scale = Math.min(safeWrapperWidth / safeVideoWidth, safeWrapperHeight / safeVideoHeight);
        const width = safeVideoWidth * scale;
        const height = safeVideoHeight * scale;

        return {
            left: round((safeWrapperWidth - width) / 2),
            top: round((safeWrapperHeight - height) / 2),
            width: round(width),
            height: round(height)
        };
    }

    function getAspectFrame(containerWidth, containerHeight, targetAspect) {
        const width = Math.max(0, Number(containerWidth) || 0);
        const height = Math.max(0, Number(containerHeight) || 0);
        const aspect = Math.max(0, Number(targetAspect) || 0);

        if (!width || !height || !aspect) {
            return { left: 0, top: 0, width, height };
        }

        const containerAspect = width / height;
        const frameWidth = containerAspect > aspect ? height * aspect : width;
        const frameHeight = containerAspect > aspect ? height : width / aspect;

        return {
            left: round((width - frameWidth) / 2),
            top: round((height - frameHeight) / 2),
            width: round(frameWidth),
            height: round(frameHeight)
        };
    }

    function getCoverViewport(width, height) {
        return {
            left: 0,
            top: 0,
            width: round(Math.max(0, Number(width) || 0)),
            height: round(Math.max(0, Number(height) || 0))
        };
    }
    function pointToFramePercent(clientX, clientY, frame, edgePercent = 3) {
        const minimum = Math.max(0, Math.min(50, Number(edgePercent) || 0));
        const width = Math.max(1, Number(frame && frame.width) || 1);
        const height = Math.max(1, Number(frame && frame.height) || 1);
        const left = Number(frame && frame.left) || 0;
        const top = Number(frame && frame.top) || 0;
        const rawLeft = ((Number(clientX) - left) / width) * 100;
        const rawTop = ((Number(clientY) - top) / height) * 100;

        return {
            left: round(Math.max(minimum, Math.min(100 - minimum, rawLeft))),
            top: round(Math.max(minimum, Math.min(100 - minimum, rawTop)))
        };
    }

    return { getContainedFrame, getAspectFrame, getCoverViewport, pointToFramePercent };
}));

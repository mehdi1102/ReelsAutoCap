const assert = require('node:assert/strict');
const test = require('node:test');

const CaptionGeometry = require('../static/caption-geometry.js');

test('contained portrait video exposes only the visible reel frame', () => {
    assert.deepEqual(
        CaptionGeometry.getContainedFrame(1080, 608, 1080, 1920),
        { left: 369, top: 0, width: 342, height: 608 }
    );
});

test('drag points are converted and clamped inside the visible video frame', () => {
    const frame = { left: 369, top: 0, width: 342, height: 608 };

    assert.deepEqual(
        CaptionGeometry.pointToFramePercent(540, 304, frame),
        { left: 50, top: 50 }
    );
    assert.deepEqual(
        CaptionGeometry.pointToFramePercent(0, 1000, frame),
        { left: 3, top: 97 }
    );
});

test('target layout frame fits each output aspect into the available stage', () => {
    assert.deepEqual(
        CaptionGeometry.getAspectFrame(900, 700, 9 / 16),
        { left: 253.125, top: 0, width: 393.75, height: 700 }
    );
    assert.deepEqual(
        CaptionGeometry.getAspectFrame(900, 700, 16 / 9),
        { left: 0, top: 96.875, width: 900, height: 506.25 }
    );
});

test('cover-mode captions use the full target output frame', () => {
    assert.deepEqual(
        CaptionGeometry.getCoverViewport(393.75, 700),
        { left: 0, top: 0, width: 393.75, height: 700 }
    );
});
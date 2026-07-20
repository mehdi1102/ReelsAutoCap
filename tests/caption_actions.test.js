const assert = require('node:assert/strict');
const test = require('node:test');

const CaptionActions = require('../static/caption-actions.js');

test('split long produces readable non-overlapping caption blocks', () => {
    const result = CaptionActions.splitLongSegments([
        { start: 0, end: 4, text: 'one two three four five six seven eight nine' }
    ]);

    assert.equal(result.length, 2);
    assert.equal(result[0].text, 'one two three four five six seven eight');
    assert.equal(result[1].text, 'nine');
    assert.ok(result[0].end <= result[1].start);
});

test('editor action state always restores after an error', async () => {
    const states = [];

    await assert.rejects(
        CaptionActions.withActionState((busy) => states.push(busy), async () => {
            throw new Error('frame unavailable');
        }),
        /frame unavailable/
    );

    assert.deepEqual(states, [true, false]);
});

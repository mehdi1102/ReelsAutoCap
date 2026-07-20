(function exposeCaptionActions(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.CaptionActions = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildCaptionActions() {
    function splitLongSegments(segments, maxWords = 8, maxChars = 46) {
        const splitSegments = [];

        (segments || []).forEach((segment) => {
            const seg = Object.assign({}, segment);
            if (seg.type === 'music') {
                splitSegments.push(seg);
                return;
            }

            const words = String(seg.text || '').split(/\s+/).filter(Boolean);
            if (words.length <= maxWords && String(seg.text || '').length <= maxChars) {
                splitSegments.push(seg);
                return;
            }

            const groups = [];
            let current = [];
            let currentChars = 0;
            words.forEach((word) => {
                const nextChars = currentChars + word.length + (current.length ? 1 : 0);
                if (current.length && (current.length >= maxWords || nextChars > maxChars)) {
                    groups.push(current);
                    current = [];
                    currentChars = 0;
                }
                current.push(word);
                currentChars += word.length + (current.length > 1 ? 1 : 0);
            });
            if (current.length) groups.push(current);

            const start = Number(seg.start) || 0;
            const end = Math.max(start + 0.35, Number(seg.end) || start + 1.8);
            const totalWords = Math.max(words.length, 1);
            let cursor = start;

            groups.forEach((group, index) => {
                const isLast = index === groups.length - 1;
                const share = group.length / totalWords;
                const available = Math.max(0, end - cursor);
                const groupEnd = isLast ? end : Math.min(end, cursor + Math.max(0.35, (end - start) * share));
                const boundedEnd = Math.max(cursor + Math.min(available, 0.25), groupEnd);

                splitSegments.push(Object.assign({}, seg, {
                    start: Math.round(cursor * 100) / 100,
                    end: Math.round(boundedEnd * 100) / 100,
                    text: group.join(' ')
                }));
                cursor = boundedEnd;
            });
        });

        return splitSegments.sort((a, b) => Number(a.start) - Number(b.start));
    }

    async function withActionState(setBusy, action) {
        setBusy(true);
        try {
            return await action();
        } finally {
            setBusy(false);
        }
    }

    return { splitLongSegments, withActionState };
}));

// --- Application State ---
let videoFile = null;
let videoUrl = null;
let subtitles = [];
let engineResults = null;
let isTranscribing = false;
let subtitleOverlayVisible = true;
let activeSegmentIndex = -1;
let styleTargetMode = 'global'; // 'global' or 'segment'
let livePlacementCanvas = null;
let livePlacementCtx = null;
let lastLivePlacementAt = 0;
let currentTargetAspect = '9-16';

const TARGET_ASPECTS = {
    '9-16': 9 / 16,
    '1-1': 1,
    '4-5': 4 / 5,
    '16-9': 16 / 9
};

// --- DOM Elements ---
const uploadZone = document.getElementById('upload-zone');
const videoInput = document.getElementById('video-input');
const playerContainer = document.getElementById('player-container');
const videoPlayer = document.getElementById('video-player');
const subtitlesOverlay = document.getElementById('subtitles-overlay');
const subtitlesOverlayText = document.getElementById('subtitles-overlay-text');

// Controls
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const progressContainer = document.getElementById('progress-container');
const progressFilled = document.getElementById('progress-filled');
const progressHover = document.getElementById('progress-hover');
const currentTimeDisplay = document.getElementById('current-time');
const durationTimeDisplay = document.getElementById('duration-time');
const speedBtn = document.getElementById('speed-btn');
const speedOptions = document.getElementById('speed-options');
const captionToggleBtn = document.getElementById('caption-toggle-btn');
const changeVideoBtn = document.getElementById('change-video-btn');

// Sidebar & Workspace
const sidebarAside = document.getElementById('sidebar-aside');
const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
const mobileDrawerBtn = document.getElementById('mobile-drawer-btn');
const aspectBtns = document.querySelectorAll('.aspect-btn');
const videoWrapper = document.getElementById('video-wrapper');
const playerPlaceholder = document.getElementById('player-placeholder');
const stageToolbar = document.getElementById('stage-toolbar');
const safeZoneGuide = document.getElementById('safe-zone-guide');
const captionViewport = document.getElementById('caption-viewport');
const safeGuideToggleBtn = document.getElementById('safe-guide-toggle-btn');

// Tabs & Navigation
const tabBtns = document.querySelectorAll('.tabs-header-redesign .tab-btn, .tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const tabEditBtn = document.getElementById('tab-edit-btn');
const tabExportBtn = document.getElementById('tab-export-btn');
const tabStyleBtn = document.getElementById('tab-style-btn');

// Workflow Step Indicators
const stepNodes = document.querySelectorAll('.step-node');

// Searchable Typography Family
const fontSelectTrigger = document.getElementById('font-select-trigger');
const selectedFontName = document.getElementById('selected-font-name');
const fontDropdownList = document.getElementById('font-dropdown-list');
const fontSearchInput = document.getElementById('font-search-input');
const fontOptions = document.querySelectorAll('.font-option');
const captionFont = document.getElementById('caption-font');

// Quick Presets
const presetCards = document.querySelectorAll('.preset-card');
const styleTargetGlobal = document.getElementById('style-target-global');
const styleTargetSegment = document.getElementById('style-target-segment');

// Customizer Overrides
const captionPreset = document.getElementById('caption-preset') || { value: 'hormozi' };
const captionSizeSlider = document.getElementById('caption-size-slider');
const sizeVal = document.getElementById('size-val');
const captionPosition = document.getElementById('caption-position');
const captionCasing = document.getElementById('caption-casing');
const captionAnimation = document.getElementById('caption-animation');

// Fine-Tuning Selectors
const captionColor = document.getElementById('caption-color');
const captionStroke = document.getElementById('caption-stroke');
const captionShadow = document.getElementById('caption-shadow');
const captionBg = document.getElementById('caption-bg');
const captionBold = document.getElementById('caption-bold');
const captionItalic = document.getElementById('caption-italic');
const captionTiltSlider = document.getElementById('caption-tilt-slider');
const tiltVal = document.getElementById('tilt-val');
const captionSpacingSlider = document.getElementById('caption-spacing-slider');
const spacingVal = document.getElementById('spacing-val');
const captionHighlightColor = document.getElementById('caption-highlight-color');
const captionWordPop = document.getElementById('caption-word-pop');
const captionSmartEmojis = document.getElementById('caption-smart-emojis');

// Bottom Timeline
const timelineZoomSlider = document.getElementById('timeline-zoom-slider');
const timelineZoomIn = document.getElementById('timeline-zoom-in');
const timelineZoomOut = document.getElementById('timeline-zoom-out');
const timelineWorkspace = document.getElementById('timeline-workspace');
const captionTrackContent = document.getElementById('caption-track-content');
const videoTrackBlock = document.getElementById('video-track-block');
const timelinePlayhead = document.getElementById('timeline-playhead');

// API Configuration Settings
const apiKeyInput = document.getElementById('api-key-input');
const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
const modelSelect = document.getElementById('model-select');
const languageSelect = document.getElementById('language-select');
const engineSelect = document.getElementById('engine-select');
const themeSelect = document.getElementById('theme-select');
const sidebarThemeSelect = document.getElementById('sidebar-theme-select');

// Transcribing Actions & Progress
const transcribeBtn = document.getElementById('transcribe-btn');
const transcribeHelpMsg = document.getElementById('transcribe-help-msg');
const progressIndicator = document.getElementById('progress-indicator');
const progressStatusTitle = document.getElementById('progress-status-title');
const progressStatusDesc = document.getElementById('progress-status-desc');
const subProgressFill = document.getElementById('sub-progress-fill');

// Editor Tab
const captionsList = document.getElementById('captions-list');
const segmentCount = document.getElementById('segment-count');
const addSegmentBtn = document.getElementById('add-segment-btn');
const smartPolishBtn = document.getElementById('smart-polish-btn');
const splitLongBtn = document.getElementById('split-long-btn');
const autoPlaceBtn = document.getElementById('auto-place-btn');

// Toast
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const funnyWaitingMessages = [
    "Teaching your captions how to dance...",
    "Making every word Instagram-ready...",
    "Convincing the subtitles to stay in sync...",
    "Adding a little main-character energy...",
    "Your reel is getting a glow-up...",
    "Finding the perfect moment to make words pop...",
    "Please do not disturb. Captions are rehearsing...",
    "Turning ordinary words into scroll-stoppers...",
    "Synchronizing vibes with vocabulary...",
    "Your reel just entered its influencer era..."
];
let funnyMessageTimer = null;
let funnyMessageIndex = 0;

function applyTheme(themeName) {
    const safeTheme = ['signature', 'dark', 'light'].includes(themeName) ? themeName : 'signature';
    document.documentElement.dataset.theme = safeTheme;
    document.body.dataset.theme = safeTheme;
    document.body.classList.remove('signature-theme', 'dark-theme', 'light-theme');
    document.body.classList.add(`${safeTheme}-theme`);
    localStorage.setItem('auto_cap_theme', safeTheme);

    const metaTheme = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
    metaTheme.name = 'theme-color';
    metaTheme.content = safeTheme === 'light' ? '#f7f4ef' : safeTheme === 'dark' ? '#03050a' : '#06070a';
    if (!metaTheme.parentNode) {
        document.head.appendChild(metaTheme);
    }

    [themeSelect, sidebarThemeSelect].forEach(select => {
        if (select) select.value = safeTheme;
    });
}

// Initialize Style Settings Object
const captionStyle = {
    preset: 'minimal',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    size: 1.48,
    position: 'auto',
    autoPlacement: true,
    resolvedPosition: 'bottom',
    resolvedOrientation: 'horizontal',
    resolvedCustomLeft: null,
    resolvedCustomTop: null,
    orientation: 'horizontal',
    casing: 'uppercase',
    animation: 'pop',
    customLeft: null,
    customTop: null,
    
    // Custom Fine-Tuning Overrides
    color: 'preset',
    stroke: 'preset',
    shadow: 'preset',
    bg: 'preset',
    bold: true,
    italic: false,
    tilt: 0,
    spacing: 0,
    
    // Karaoke & Emojis Overrides
    highlightColor: '#ffd84d',
    wordPop: true,
    smartEmojis: true
};

const MUSIC_MARKER = '\u266a \u266b \u266a';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Load Saved Settings
    applyTheme(localStorage.getItem('auto_cap_theme') || 'signature');

    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
    
    const savedModel = localStorage.getItem('gemini_model');
    if (savedModel) {
        modelSelect.value = savedModel;
    }

    const savedLanguage = localStorage.getItem('gemini_language');
    const languageDefaultVersion = localStorage.getItem('caption_language_default_v2');
    if (languageDefaultVersion !== 'english-v3') {
        languageSelect.value = 'en-US';
        localStorage.setItem('gemini_language', 'en-US');
        localStorage.setItem('caption_language_default_v2', 'english-v3');
    } else if (savedLanguage && Array.from(languageSelect.options).some(option => option.value === savedLanguage)) {
        languageSelect.value = savedLanguage;
    } else {
        languageSelect.value = 'en-US';
    }

    const savedEngine = localStorage.getItem('transcribe_engine');
    if (savedEngine) {
        engineSelect.value = savedEngine;
    }

    initStyleControls();
    initDraggableOverlay();
    setupEventListeners();
    if ('ResizeObserver' in window && playerContainer) {
        const stageResizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(updateVideoStageLayout);
        });
        stageResizeObserver.observe(playerContainer);
    }
    initAppRouter();
    updateTimelinePlayhead();
});

const WIZARD_PAGES = ['home', 'upload', 'edit', 'export'];

function initAppRouter() {
    window.addEventListener('hashchange', renderRoute);
    renderRoute();
}

function navigateToPage(pageName) {
    // If trying to access edit or export pages without a video file, redirect back to upload page!
    if ((pageName === 'edit' || pageName === 'export') && !videoFile) {
        pageName = 'upload';
    }
    window.location.hash = pageName;
    renderRoute();
}

function renderRoute() {
    let route = (window.location.hash || '#home').replace('#', '') || 'home';
    
    // Normalize routes
    const validRoutes = ['home', 'upload', 'edit', 'export', 'templates', 'projects', 'settings'];
    if (!validRoutes.includes(route)) {
        route = 'home';
    }
    
    // Force upload page if no video loaded and trying to edit/export
    if ((route === 'edit' || route === 'export') && !videoFile) {
        route = 'upload';
        window.location.hash = 'upload';
    }

    // Move video player dynamically between containers depending on page
    if (route === 'edit') {
        moveVideoPlayerToContainer('player-container');
    } else if (route === 'export') {
        moveVideoPlayerToContainer('export-player-wrapper');
    }

    // Set page transition states
    const targetIdx = WIZARD_PAGES.indexOf(route);
    
    if (targetIdx !== -1) {
        // It's a wizard page
        WIZARD_PAGES.forEach((pageName, idx) => {
            const pageEl = document.getElementById(`${pageName}-page`);
            if (pageEl) {
                pageEl.classList.remove('active', 'past');
                if (idx < targetIdx) {
                    pageEl.classList.add('past');
                } else if (idx === targetIdx) {
                    pageEl.classList.add('active');
                }
                // If idx > targetIdx, it remains on the right (hidden)
            }
        });
        
        // Hide secondary pages
        document.querySelectorAll('.route-page').forEach(page => {
            page.classList.add('hidden');
        });
    } else {
        // It's a secondary page (templates, projects, settings)
        // Hide all wizard pages
        WIZARD_PAGES.forEach(pageName => {
            const pageEl = document.getElementById(`${pageName}-page`);
            if (pageEl) {
                pageEl.classList.remove('active', 'past');
            }
        });
        
        // Show selected secondary page
        document.querySelectorAll('.route-page').forEach(page => {
            page.classList.toggle('hidden', page.dataset.page !== route);
        });
    }

    // Sync progress tracking step nodes if step tracker exists
    updateStepTrackerUI(route);

    // Call layout adjustment
    requestAnimationFrame(updateVideoStageLayout);
}

function moveVideoPlayerToContainer(containerId) {
    const wrapper = document.getElementById('video-wrapper');
    const targetContainer = document.getElementById(containerId);
    if (wrapper && targetContainer && wrapper.parentElement !== targetContainer) {
        targetContainer.appendChild(wrapper);
        wrapper.classList.remove('hidden');
    }
}

function updateStepTrackerUI(route) {
    const steps = document.querySelectorAll('.step-tracker .step');
    const lines = document.querySelectorAll('.step-tracker .step-line');
    
    if (steps.length === 0) return;
    
    let activeStepIdx = 0;
    if (route === 'upload') activeStepIdx = 0;
    else if (route === 'edit') activeStepIdx = 1;
    else if (route === 'export') activeStepIdx = 2;
    
    steps.forEach((step, idx) => {
        step.classList.remove('active', 'completed');
        if (idx < activeStepIdx) {
            step.classList.add('completed');
        } else if (idx === activeStepIdx) {
            step.classList.add('active');
        }
    });
    
    lines.forEach((line, idx) => {
        line.classList.toggle('active', idx < activeStepIdx);
    });
}

// --- Dynamic Styling Configuration Management ---
function initStyleControls() {
    let styleSource = captionStyle;
    
    // Check if styling a single selected segment overrides global values
    if (styleTargetMode === 'segment' && activeSegmentIndex !== -1 && subtitles[activeSegmentIndex]) {
        if (!subtitles[activeSegmentIndex].style) {
            // Clone current global settings as a starting point
            subtitles[activeSegmentIndex].style = Object.assign({}, captionStyle);
        }
        styleSource = subtitles[activeSegmentIndex].style;
    }

    // Set UI elements
    presetCards.forEach(card => {
        card.classList.toggle('active', card.dataset.preset === styleSource.preset);
    });

    const fontOpt = Array.from(fontOptions).find(opt => opt.dataset.font === styleSource.fontFamily);
    if (fontOpt) {
        selectedFontName.textContent = fontOpt.textContent;
    }
    captionFont.value = styleSource.fontFamily;

    captionSizeSlider.value = styleSource.size;
    sizeVal.textContent = styleSource.size;

    captionPosition.value = styleSource.position;
    captionCasing.value = styleSource.casing;
    captionAnimation.value = styleSource.animation;

    captionColor.value = styleSource.color;
    captionStroke.value = styleSource.stroke;
    captionShadow.value = styleSource.shadow;
    captionBg.value = styleSource.bg;
    captionBold.checked = styleSource.bold;
    captionItalic.checked = styleSource.italic;
    captionTiltSlider.value = styleSource.tilt;
    tiltVal.textContent = styleSource.tilt;
    captionSpacingSlider.value = styleSource.spacing;
    spacingVal.textContent = styleSource.spacing;
    captionHighlightColor.value = styleSource.highlightColor;
    captionWordPop.checked = styleSource.wordPop;
    captionSmartEmojis.checked = styleSource.smartEmojis;

    updateOverlayClasses();
}

// --- Drag and Drop Placement Logic (CapCut style pointer capture) ---
function initDraggableOverlay() {
    let activeDrag = false;

    subtitlesOverlayText.addEventListener('mousedown', dragStart);
    subtitlesOverlayText.addEventListener('touchstart', dragStart, { passive: true });
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
        let styleSource = captionStyle;
        if (styleTargetMode === 'segment' && activeSegmentIndex !== -1 && subtitles[activeSegmentIndex]) {
            if (!subtitles[activeSegmentIndex].style) {
                subtitles[activeSegmentIndex].style = Object.assign({}, captionStyle);
            }
            styleSource = subtitles[activeSegmentIndex].style;
        }

        if (styleSource.position !== 'custom') {
            updateStyleProperty('position', 'custom');
            captionPosition.value = 'custom';
        }
        activeDrag = true;
    }

    function drag(e) {
        if (!activeDrag) return;
        if (e.type === 'touchmove') e.preventDefault();
        
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        
        const pRect = getCaptionFrameRect();
        const point = CaptionGeometry.pointToFramePercent(clientX, clientY, pRect);
        
        updateStyleProperty('customLeft', `${point.left.toFixed(1)}%`);
        updateStyleProperty('customTop', `${point.top.toFixed(1)}%`);
    }

    function dragEnd() {
        activeDrag = false;
    }
}

function clampCustomPosition() {
    let styleSource = captionStyle;
    if (styleTargetMode === 'segment' && activeSegmentIndex !== -1 && subtitles[activeSegmentIndex]) {
        if (!subtitles[activeSegmentIndex].style) {
            subtitles[activeSegmentIndex].style = Object.assign({}, captionStyle);
        }
        styleSource = subtitles[activeSegmentIndex].style;
    }

    if (styleSource.customLeft && styleSource.customTop) {
        let leftVal = parseFloat(styleSource.customLeft);
        let topVal = parseFloat(styleSource.customTop);
        leftVal = Math.max(10, Math.min(leftVal, 90));
        topVal = Math.max(10, Math.min(topVal, 90));
        styleSource.customLeft = `${leftVal}%`;
        styleSource.customTop = `${topVal}%`;
        
        if (styleSource === captionStyle) {
            localStorage.setItem('cc_custom_left', captionStyle.customLeft);
            localStorage.setItem('cc_custom_top', captionStyle.customTop);
        }
    }
}

function getCaptionStyleContext() {
    const currTime = videoPlayer.currentTime;
    const activeSeg = subtitles.find(seg => currTime >= seg.start && currTime <= seg.end);

    if (activeSeg && activeSeg.style) {
        return activeSeg.style;
    }

    const styleTab = document.getElementById('style-tab');
    if (styleTab && styleTab.classList.contains('active') &&
        styleTargetMode === 'segment' &&
        activeSegmentIndex !== -1 &&
        subtitles[activeSegmentIndex]) {
        return subtitles[activeSegmentIndex].style || captionStyle;
    }

    return captionStyle;
}

function getEffectivePlacement(styleSource) {
    const isAuto = styleSource.autoPlacement || styleSource.position === 'auto';
    return {
        position: isAuto ? (styleSource.resolvedPosition || 'bottom') : styleSource.position,
        orientation: isAuto ? (styleSource.resolvedOrientation || styleSource.orientation || 'horizontal') : (styleSource.orientation || 'horizontal'),
        customLeft: isAuto ? (styleSource.resolvedCustomLeft || styleSource.customLeft) : styleSource.customLeft,
        customTop: isAuto ? (styleSource.resolvedCustomTop || styleSource.customTop) : styleSource.customTop
    };
}

function updateVideoStageLayout() {
    if (!playerContainer || !videoWrapper) return null;

    const stageRect = playerContainer.getBoundingClientRect();
    const targetAspect = TARGET_ASPECTS[currentTargetAspect] || TARGET_ASPECTS['9-16'];
    const frame = CaptionGeometry.getAspectFrame(stageRect.width, stageRect.height, targetAspect);

    if (!frame.width || !frame.height) return null;

    videoWrapper.style.width = `${frame.width}px`;
    videoWrapper.style.height = `${frame.height}px`;

    return updateCaptionViewport();
}

function updateCaptionViewport() {
    if (!captionViewport || !videoWrapper) return null;

    const wrapperRect = videoWrapper.getBoundingClientRect();
    if (!wrapperRect.width || !wrapperRect.height) return null;

    const frame = CaptionGeometry.getCoverViewport(wrapperRect.width, wrapperRect.height);

    captionViewport.style.left = `${frame.left}px`;
    captionViewport.style.top = `${frame.top}px`;
    captionViewport.style.width = `${frame.width}px`;
    captionViewport.style.height = `${frame.height}px`;

    return {
        left: wrapperRect.left + frame.left,
        top: wrapperRect.top + frame.top,
        width: frame.width,
        height: frame.height
    };
}

function getCaptionFrameRect() {
    const frame = updateCaptionViewport();
    if (frame) return frame;
    return videoWrapper.getBoundingClientRect();
}

function fitCaptionInsideVideoFrame() {
    if (!videoWrapper || !subtitlesOverlay || !subtitlesOverlayText || subtitlesOverlay.classList.contains('hidden')) {
        return;
    }

    const styleSource = getCaptionStyleContext();
    const wrapperRect = getCaptionFrameRect();
    if (!wrapperRect.width || !wrapperRect.height) return;

    const placement = getEffectivePlacement(styleSource);
    const orientation = placement.orientation || 'horizontal';
    const isVertical = orientation === 'vertical-left' || orientation === 'vertical-right';
    const baseRem = Number(styleSource.size) || 1.6;
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const maxFramePx = isVertical
        ? Math.min(wrapperRect.width * 0.115, wrapperRect.height * 0.078)
        : Math.min(wrapperRect.width * 0.095, wrapperRect.height * 0.105);
    const safeFontPx = Math.max(13, Math.min(baseRem * rootPx, maxFramePx));
    subtitlesOverlayText.style.fontSize = `${safeFontPx}px`;

    const safeWidth = isVertical ? wrapperRect.width * 0.32 : wrapperRect.width * 0.86;
    const safeHeight = isVertical ? wrapperRect.height * 0.78 : wrapperRect.height * 0.34;
    subtitlesOverlayText.style.maxWidth = `${Math.max(96, safeWidth)}px`;
    subtitlesOverlayText.style.maxHeight = `${Math.max(70, safeHeight)}px`;

    const textRect = subtitlesOverlayText.getBoundingClientRect();
    const widthScale = safeWidth / Math.max(textRect.width, 1);
    const heightScale = safeHeight / Math.max(textRect.height, 1);
    const scale = Math.min(1, widthScale, heightScale);
    if (scale < 0.98) {
        subtitlesOverlayText.style.fontSize = `${Math.max(11, safeFontPx * scale)}px`;
    }

    if (placement.position === 'custom') {
        const fittedRect = subtitlesOverlayText.getBoundingClientRect();
        const minLeft = ((fittedRect.width / 2) / wrapperRect.width) * 100 + 3;
        const minTop = ((fittedRect.height / 2) / wrapperRect.height) * 100 + 3;
        const rawLeft = parseFloat(placement.customLeft || '50');
        const rawTop = parseFloat(placement.customTop || '50');
        const clampedLeft = Math.max(minLeft, Math.min(rawLeft, 100 - minLeft));
        const clampedTop = Math.max(minTop, Math.min(rawTop, 100 - minTop));
        subtitlesOverlay.style.left = `${clampedLeft}%`;
        subtitlesOverlay.style.top = `${clampedTop}%`;
    }
}

function scheduleCaptionFit() {
    requestAnimationFrame(() => {
        fitCaptionInsideVideoFrame();
    });
}

function updateStyleProperty(key, value, isLocalStorage = true) {
    if (styleTargetMode === 'segment' && activeSegmentIndex !== -1 && subtitles[activeSegmentIndex]) {
        if (!subtitles[activeSegmentIndex].style) {
            subtitles[activeSegmentIndex].style = Object.assign({}, captionStyle);
        }
        subtitles[activeSegmentIndex].style[key] = value;
        if (key === 'position') {
            subtitles[activeSegmentIndex].style.autoPlacement = value === 'auto';
            if (value !== 'auto') {
                subtitles[activeSegmentIndex].style.resolvedPosition = null;
                subtitles[activeSegmentIndex].style.resolvedCustomLeft = null;
                subtitles[activeSegmentIndex].style.resolvedCustomTop = null;
            }
        }
    } else {
        captionStyle[key] = value;
        if (key === 'position') {
            captionStyle.autoPlacement = value === 'auto';
            if (value !== 'auto') {
                captionStyle.resolvedPosition = null;
                captionStyle.resolvedCustomLeft = null;
                captionStyle.resolvedCustomTop = null;
            }
        }
        subtitles.forEach(seg => {
            if (!seg.style) {
                seg.style = Object.assign({}, captionStyle);
            }
            seg.style[key] = value;
            if (key === 'position') {
                seg.style.autoPlacement = value === 'auto';
                if (value !== 'auto') {
                    seg.style.resolvedPosition = null;
                    seg.style.resolvedCustomLeft = null;
                    seg.style.resolvedCustomTop = null;
                }
            }
        });
        if (isLocalStorage) {
            let lsKey = 'cc_' + key.toLowerCase();
            localStorage.setItem(lsKey, value);
        }
    }
    
    // Clear dynamic rendering cache so text updates immediately
    lastText = '';
    
    // Refresh visual styling card overrides indicator badges and subtitle overlays
    updateOverlayClasses();
    renderSubtitleCards();
}

// --- Sync Style Classes to Subtitle Div overlays ---
function updateOverlayClasses(customStyle = null, skipSync = false) {
    let styleSource = customStyle;
    
    // Resolve dynamic styling context
    if (!styleSource) {
        const currTime = videoPlayer.currentTime;
        const activeSeg = subtitles.find(seg => currTime >= seg.start && currTime <= seg.end);
        
        if (activeSeg && activeSeg.style) {
            styleSource = activeSeg.style;
        } else if (document.getElementById('style-tab').classList.contains('active') && 
                   styleTargetMode === 'segment' && 
                   activeSegmentIndex !== -1 && 
                   subtitles[activeSegmentIndex]) {
            if (!subtitles[activeSegmentIndex].style) {
                subtitles[activeSegmentIndex].style = Object.assign({}, captionStyle);
            }
            styleSource = subtitles[activeSegmentIndex].style;
        } else {
            styleSource = captionStyle;
        }
    }

    updateCaptionViewport();

    // Reset styles
    subtitlesOverlay.className = 'subtitles-overlay';
    subtitlesOverlayText.style.cssText = '';

    // Apply Presets base
    if (styleSource.preset === 'hormozi') {
        subtitlesOverlay.classList.add('cc-preset-hormozi');
    } else if (styleSource.preset === 'neon') {
        subtitlesOverlay.classList.add('cc-preset-neon');
    } else if (styleSource.preset === 'minimal') {
        subtitlesOverlay.classList.add('cc-preset-minimal');
    } else if (styleSource.preset === 'cyber') {
        subtitlesOverlay.classList.add('cc-preset-cyber');
    } else if (styleSource.preset === 'cinematic') {
        subtitlesOverlay.classList.add('cc-preset-cinematic');
    } else if (styleSource.preset === 'comic') {
        subtitlesOverlay.classList.add('cc-preset-comic');
    } else if (styleSource.preset === 'luxury') {
        subtitlesOverlay.classList.add('cc-preset-luxury');
    } else if (styleSource.preset === 'stamp') {
        subtitlesOverlay.classList.add('cc-preset-stamp');
    } else if (styleSource.preset === 'bouncy') {
        subtitlesOverlayText.style.fontFamily = "'Fredoka', sans-serif";
        subtitlesOverlayText.style.webkitTextStroke = "1px rgba(0,0,0,0.78)";
        subtitlesOverlayText.style.textShadow = "0 3px 0 rgba(0,0,0,0.82), 0 10px 22px rgba(0,0,0,0.38)";
    }

    const effectivePlacement = getEffectivePlacement(styleSource);
    const orientation = effectivePlacement.orientation || 'horizontal';
    const isVerticalOrientation = orientation === 'vertical-left' || orientation === 'vertical-right';
    subtitlesOverlay.classList.toggle('cc-orientation-vertical', isVerticalOrientation);
    subtitlesOverlay.classList.toggle('cc-orientation-left', orientation === 'vertical-left');
    subtitlesOverlay.classList.toggle('cc-orientation-right', orientation === 'vertical-right');

    // Apply Overrides on Text
    const s = subtitlesOverlayText.style;
    s.fontFamily = styleSource.fontFamily;
    s.fontSize = `${styleSource.size}rem`;
    s.letterSpacing = `${styleSource.spacing}px`;
    s.transform = `rotate(${styleSource.tilt}deg)`;
    s.fontWeight = styleSource.bold ? '900' : '500';
    s.fontStyle = styleSource.italic ? 'italic' : 'normal';

    // Fine-Tuning Overrides
    if (styleSource.color !== 'preset') {
        s.color = styleSource.color;
    }
    if (styleSource.stroke !== 'preset') {
        if (styleSource.stroke === 'none') {
            s.webkitTextStroke = 'unset';
        } else {
            s.webkitTextStroke = styleSource.stroke;
        }
    }
    if (styleSource.shadow !== 'preset') {
        if (styleSource.shadow === 'none') {
            s.textShadow = 'none';
        } else if (styleSource.shadow === 'shadow') {
            s.textShadow = '0 3px 12px rgba(0,0,0,0.58), 0 1px 2px rgba(0,0,0,0.78)';
        } else if (styleSource.shadow === 'glow-cyan') {
            s.textShadow = '0 0 8px rgba(0,229,255,0.8), 0 8px 22px rgba(0,0,0,0.62)';
        } else if (styleSource.shadow === 'glow-pink') {
            s.textShadow = '0 0 8px rgba(255,64,129,0.78), 0 8px 22px rgba(0,0,0,0.62)';
        } else if (styleSource.shadow === 'glow-green') {
            s.textShadow = '0 0 8px rgba(57,255,201,0.74), 0 8px 22px rgba(0,0,0,0.62)';
        }
    }
    if (styleSource.bg !== 'preset') {
        if (styleSource.bg === 'none') {
            s.background = 'transparent';
            s.padding = '0';
            s.borderRadius = '0';
            subtitlesOverlay.style.padding = '0 10%';
        } else if (styleSource.bg === 'pill') {
            s.background = 'rgba(0, 0, 0, 0.75)';
            s.padding = '6px 16px';
            s.borderRadius = 'var(--radius-md)';
            subtitlesOverlay.style.padding = '0 10%';
        } else if (styleSource.bg === 'banner') {
            s.background = 'rgba(0, 0, 0, 0.75)';
            s.padding = '10px 0';
            s.borderRadius = '0';
            subtitlesOverlay.style.padding = '0';
            s.width = '100%';
        }
    }

    // Apply Position Rules
    if (effectivePlacement.position === 'custom') {
        clampCustomPosition();
        subtitlesOverlay.classList.add('cc-custom-pos');
        if (effectivePlacement.customLeft && effectivePlacement.customTop) {
            subtitlesOverlay.style.left = effectivePlacement.customLeft;
            subtitlesOverlay.style.top = effectivePlacement.customTop;
            subtitlesOverlay.style.bottom = 'unset';
            subtitlesOverlay.style.transform = 'translate(-50%, -50%)';
            if (isVerticalOrientation) {
                subtitlesOverlay.style.right = 'unset';
            }
        }
    } else {
        subtitlesOverlay.style.left = '0';
        subtitlesOverlay.style.right = '0';
        subtitlesOverlay.style.transform = 'none';
        
        if (effectivePlacement.position === 'top') {
            subtitlesOverlay.style.top = '12%';
            subtitlesOverlay.style.bottom = 'unset';
        } else if (effectivePlacement.position === 'center') {
            subtitlesOverlay.style.top = '45%';
            subtitlesOverlay.style.bottom = 'unset';
        } else if (effectivePlacement.position === 'bottom') {
            subtitlesOverlay.style.bottom = '12%';
            subtitlesOverlay.style.top = 'unset';
        } else {
            // Auto aspect ratio placements
            const isPortrait = videoPlayer.videoWidth / (videoPlayer.videoHeight || 1) < 1;
            if (isPortrait) {
                subtitlesOverlay.style.bottom = '28%'; // center bottom safe reels area
                subtitlesOverlay.style.top = 'unset';
            } else {
                subtitlesOverlay.style.bottom = '12%';
                subtitlesOverlay.style.top = 'unset';
            }
        }
    }

    if (!skipSync) {
        syncSubtitlesOverlay();
    }
    scheduleCaptionFit();
}

// --- Transcription Engine UI View ---
function toggleEngineUI() {
    const engine = engineSelect.value;
    if (engine === 'free') {
        settingsPanel.classList.add('hidden');
    } else {
        settingsPanel.classList.remove('hidden');
    }
}

// --- Helper: Toast Notification ---
function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    toast.style.borderColor = type === 'error' ? 'var(--danger)' : 'var(--accent-cyan)';
    toast.classList.remove('hidden');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

function startFunnyProgressMessages() {
    stopFunnyProgressMessages();
    funnyMessageIndex = 0;
    progressStatusDesc.textContent = funnyWaitingMessages[funnyMessageIndex];
    funnyMessageTimer = setInterval(() => {
        funnyMessageIndex = (funnyMessageIndex + 1) % funnyWaitingMessages.length;
        progressStatusDesc.classList.remove('message-swap');
        void progressStatusDesc.offsetWidth;
        progressStatusDesc.textContent = funnyWaitingMessages[funnyMessageIndex];
        progressStatusDesc.classList.add('message-swap');
    }, 2600);
}

function stopFunnyProgressMessages() {
    if (funnyMessageTimer) {
        clearInterval(funnyMessageTimer);
        funnyMessageTimer = null;
    }
}

// --- Setup Event Listeners ---
function setupEventListeners() {
    // Collapsible Sidebar
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            const wrapper = document.querySelector('.dashboard-wrapper');
            if (wrapper) wrapper.classList.toggle('collapsed-sidebar');
            requestAnimationFrame(updateVideoStageLayout);
        });
    }

    if (mobileDrawerBtn) {
        mobileDrawerBtn.addEventListener('click', () => {
            const wrapper = document.querySelector('.dashboard-wrapper');
            if (wrapper) wrapper.classList.toggle('sidebar-open');
        });
    }

    // Template selection clicks
    document.querySelectorAll('.template-card button, .template-card .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            const templateName = card && card.dataset.template;
            if (templateName) {
                document.querySelectorAll('.template-card').forEach(item => item.classList.remove('selected'));
                card.classList.add('selected');
                applyPresetDefaults(templateName);
                if (videoFile) {
                    navigateToPage('edit');
                } else {
                    navigateToPage('upload');
                }
                showToast(`${card.querySelector('h3').textContent} template applied.`);
            }
        });
    });

    // Page 3 Next Button
    const goExportBtn = document.getElementById('go-to-export-btn');
    if (goExportBtn) {
        goExportBtn.addEventListener('click', () => {
            navigateToPage('export');
        });
    }

    // Page 4 Start Over / Reset Buttons
    const startOverBtns = document.querySelectorAll('#start-over-btn, .start-over-btn');
    startOverBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Stop playback
            videoPlayer.pause();
            videoPlayer.src = '';
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
            videoFile = null;
            videoUrl = null;
            subtitles = [];
            activeSegmentIndex = -1;
            lastText = '';
            
            // Toggle visibility classes back to default
            document.getElementById('media-info-box').classList.add('hidden');
            document.getElementById('upload-zone').classList.remove('hidden');
            document.getElementById('transcribe-btn').disabled = true;
            document.getElementById('transcribe-help-msg').classList.remove('hidden');
            
            // Clear timeline
            captionTrackContent.innerHTML = `<div class="caption-track-empty">Timeline empty. Generate captions to build caption tracks.</div>`;
            videoTrackBlock.textContent = 'Upload video to render video track...';
            renderSubtitleCards();
            updateTranscribeButtonState();
            
            navigateToPage('upload');
        });
    });

    function switchTab(tabId) {
        // Compatibility wrapper for legacy helpers
        if (tabId === 'edit-tab') {
            navigateToPage('edit');
        } else if (tabId === 'style-tab') {
            navigateToPage('edit');
        } else if (tabId === 'export-tab') {
            navigateToPage('export');
        } else {
            navigateToPage('upload');
        }
    }

    // Aspect Ratio format switcher
    aspectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            aspectBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const aspect = btn.dataset.aspect;
            currentTargetAspect = TARGET_ASPECTS[aspect] ? aspect : '9-16';
            videoWrapper.classList.remove('aspect-9-16', 'aspect-1-1', 'aspect-4-5', 'aspect-16-9');
            videoWrapper.classList.add(`aspect-${aspect}`);
            updateVideoStageLayout();
            
            // Clamp custom positions to prevent text disappearing off-screen
            clampCustomPosition();
            updateOverlayClasses();
            scheduleCaptionFit();
        });
    });

    // Safe zone guides toggle
    safeGuideToggleBtn.addEventListener('click', () => {
        safeGuideToggleBtn.classList.toggle('active');
        safeZoneGuide.classList.toggle('hidden');
    });

    // Searchable Autocomplete Custom Font selector dropdown bindings
    fontSelectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        fontDropdownList.classList.toggle('hidden');
        if (!fontDropdownList.classList.contains('hidden')) {
            fontSearchInput.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-font-selector')) {
            fontDropdownList.classList.add('hidden');
        }
    });

    fontSearchInput.addEventListener('input', () => {
        const q = fontSearchInput.value.toLowerCase().trim();
        fontOptions.forEach(opt => {
            const name = opt.textContent.toLowerCase();
            opt.classList.toggle('hidden', !name.includes(q));
        });
    });

    fontOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const fontVal = opt.dataset.font;
            selectedFontName.textContent = opt.textContent;
            captionFont.value = fontVal;
            
            // Dispatch change event to save
            captionFont.dispatchEvent(new Event('change'));
            fontDropdownList.classList.add('hidden');
        });
    });

    // Playback Speed controls
    speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedOptions.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        speedOptions.classList.add('hidden');
    });

    speedOptions.querySelectorAll('div').forEach(opt => {
        opt.addEventListener('click', () => {
            const speed = parseFloat(opt.dataset.speed);
            videoPlayer.playbackRate = speed;
            speedBtn.textContent = `${speed.toFixed(1)}x`;
            
            speedOptions.querySelectorAll('div').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    // Settings Toggle inside transcribe setup
    apiKeyInput.addEventListener('input', () => {
        localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
        updateTranscribeButtonState();
    });

    toggleKeyVisibilityBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleKeyVisibilityBtn.textContent = 'Hide';
        } else {
            apiKeyInput.type = 'password';
            toggleKeyVisibilityBtn.textContent = 'Show';
        }
    });

    engineSelect.addEventListener('change', () => {
        localStorage.setItem('transcribe_engine', engineSelect.value);
        toggleEngineUI();
        updateTranscribeButtonState();
    });
    
    modelSelect.addEventListener('change', () => {
        localStorage.setItem('gemini_model', modelSelect.value);
    });
    
    languageSelect.addEventListener('change', () => {
        localStorage.setItem('gemini_language', languageSelect.value);
    });

    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            applyTheme(themeSelect.value);
            showToast(`Theme changed to ${themeSelect.options[themeSelect.selectedIndex].text}.`);
        });
    }

    if (sidebarThemeSelect) {
        sidebarThemeSelect.addEventListener('change', () => {
            applyTheme(sidebarThemeSelect.value);
            showToast(`Theme changed to ${sidebarThemeSelect.options[sidebarThemeSelect.selectedIndex].text}.`);
        });
    }

    window.addEventListener('storage', (event) => {
        if (event.key === 'auto_cap_theme') {
            applyTheme(event.newValue || 'signature');
        }
    });

    window.addEventListener('resize', () => {
        updateVideoStageLayout();
        scheduleCaptionFit();
    });

    // File drag/drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleVideoSelect(e.dataTransfer.files[0]);
        }
    });

    videoInput.addEventListener('change', () => {
        if (videoInput.files.length > 0) {
            handleVideoSelect(videoInput.files[0]);
        }
    });

    changeVideoBtn.addEventListener('click', () => {
        videoPlayer.pause();
        videoPlayer.src = '';
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
        videoFile = null;
        videoUrl = null;
        subtitles = [];
        activeSegmentIndex = -1;
        lastText = '';
        
        // Hide player, show upload
        playerContainer.classList.add('empty-player-state');
        videoWrapper.classList.add('hidden');
        playerPlaceholder.classList.remove('hidden');
        stageToolbar.classList.add('hidden');
        
        uploadZone.classList.remove('hidden');
        document.getElementById('media-info-box').classList.add('hidden');
        
        // Disable tabs
        tabEditBtn.setAttribute('disabled', 'true');
        tabStyleBtn.setAttribute('disabled', 'true');
        tabExportBtn.setAttribute('disabled', 'true');
        
        switchTab('transcribe-tab');
        
        document.getElementById('transcript-preview-box').textContent = "Generate captions to see transcript preview here...";
        
        // Clear timeline tracks
        captionTrackContent.innerHTML = `<div class="caption-track-empty">Timeline empty. Generate captions to build caption tracks.</div>`;
        videoTrackBlock.textContent = 'Upload video to render video track...';
        renderSubtitleCards();
        
        updateTranscribeButtonState();
    });

    // Playback media binds
    playPauseBtn.addEventListener('click', togglePlayPause);
    videoPlayer.addEventListener('click', togglePlayPause);

    videoPlayer.addEventListener('play', () => {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    });

    videoPlayer.addEventListener('pause', () => {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    });

    videoPlayer.addEventListener('loadedmetadata', () => {
        updateVideoStageLayout();
        durationTimeDisplay.textContent = formatTime(videoPlayer.duration);
        updateOverlayClasses();
        renderTimeline();
        scheduleCaptionFit();
    });

    videoPlayer.addEventListener('timeupdate', () => {
        const percent = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        progressFilled.style.width = `${percent}%`;
        currentTimeDisplay.textContent = formatTime(videoPlayer.currentTime);
        
        syncSubtitlesOverlay();
        highlightActiveEditorCard();
        updateTimelinePlayhead();
    });

    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        videoPlayer.currentTime = pos * videoPlayer.duration;
    });

    captionToggleBtn.addEventListener('click', () => {
        subtitleOverlayVisible = !subtitleOverlayVisible;
        captionToggleBtn.classList.toggle('active', subtitleOverlayVisible);
        subtitlesOverlay.classList.toggle('hidden', !subtitleOverlayVisible);
    });

    // Target Selector bindings
    styleTargetGlobal.addEventListener('click', () => {
        styleTargetGlobal.classList.add('active');
        styleTargetSegment.classList.remove('active');
        styleTargetMode = 'global';
        initStyleControls();
    });

    styleTargetSegment.addEventListener('click', () => {
        if (activeSegmentIndex === -1) return;
        styleTargetSegment.classList.add('active');
        styleTargetGlobal.classList.remove('active');
        styleTargetMode = 'segment';
        initStyleControls();
    });

    // Preset selection clicks
    presetCards.forEach(card => {
        card.addEventListener('click', () => {
            presetCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const presetVal = card.dataset.preset;
            applyPresetDefaults(presetVal);
            
            initStyleControls();
        });
    });

    // Custom stylers change bindings
    captionFont.addEventListener('change', () => {
        updateStyleProperty('fontFamily', captionFont.value);
    });

    captionSizeSlider.addEventListener('input', () => {
        updateStyleProperty('size', parseFloat(captionSizeSlider.value));
        sizeVal.textContent = captionSizeSlider.value;
    });

    captionPosition.addEventListener('change', () => {
        updateStyleProperty('position', captionPosition.value);
    });

    captionCasing.addEventListener('change', () => {
        updateStyleProperty('casing', captionCasing.value);
    });

    captionAnimation.addEventListener('change', () => {
        updateStyleProperty('animation', captionAnimation.value);
    });

    captionColor.addEventListener('change', () => {
        updateStyleProperty('color', captionColor.value);
    });

    captionStroke.addEventListener('change', () => {
        updateStyleProperty('stroke', captionStroke.value);
    });

    captionShadow.addEventListener('change', () => {
        updateStyleProperty('shadow', captionShadow.value);
    });

    captionBg.addEventListener('change', () => {
        updateStyleProperty('bg', captionBg.value);
    });

    captionBold.addEventListener('change', () => {
        updateStyleProperty('bold', captionBold.checked);
    });

    captionItalic.addEventListener('change', () => {
        updateStyleProperty('italic', captionItalic.checked);
    });

    captionTiltSlider.addEventListener('input', () => {
        updateStyleProperty('tilt', parseInt(captionTiltSlider.value));
        tiltVal.textContent = captionTiltSlider.value;
    });

    captionSpacingSlider.addEventListener('input', () => {
        updateStyleProperty('spacing', parseInt(captionSpacingSlider.value));
        spacingVal.textContent = captionSpacingSlider.value;
    });

    captionHighlightColor.addEventListener('change', () => {
        updateStyleProperty('highlightColor', captionHighlightColor.value);
    });

    captionWordPop.addEventListener('change', () => {
        updateStyleProperty('wordPop', captionWordPop.checked);
    });

    captionSmartEmojis.addEventListener('change', () => {
        updateStyleProperty('smartEmojis', captionSmartEmojis.checked);
    });

    // Timeline Zoom Slider binds
    timelineZoomSlider.addEventListener('input', () => {
        renderTimeline();
    });

    timelineZoomIn.addEventListener('click', () => {
        const val = Math.min(10, parseInt(timelineZoomSlider.value) + 1);
        timelineZoomSlider.value = val;
        renderTimeline();
    });

    timelineZoomOut.addEventListener('click', () => {
        const val = Math.max(1, parseInt(timelineZoomSlider.value) - 1);
        timelineZoomSlider.value = val;
        renderTimeline();
    });

    // Transcribe execution click
    transcribeBtn.addEventListener('click', triggerTranscription);

    smartPolishBtn.addEventListener('click', async () => {
        if (subtitles.length === 0) return;
        try {
            const placement = await runCaptionEditorAction(smartPolishCaptions);
            showToast(placement.updated ? 'Captions polished and repositioned.' : 'Captions polished. Frame placement will update once the video is ready.');
        } catch (error) {
            console.error('Smart Polish failed:', error);
            showToast(error.message || 'Smart Polish could not complete.', 'error');
        }
    });

    splitLongBtn.addEventListener('click', async () => {
        if (subtitles.length === 0) return;
        try {
            const result = await runCaptionEditorAction(async () => {
                const before = subtitles.length;
                subtitles = splitLongCaptionSegments(normalizeSubtitleSegments(subtitles));
                renderSubtitleCards();
                renderTimeline();
                syncSubtitlesOverlay();
                return { added: subtitles.length - before };
            });
            showToast(result.added > 0 ? `Split ${result.added} extra caption blocks.` : 'All caption blocks are already short and readable.');
        } catch (error) {
            console.error('Split Long failed:', error);
            showToast(error.message || 'Split Long could not complete.', 'error');
        }
    });

    autoPlaceBtn.addEventListener('click', async () => {
        if (subtitles.length === 0) return;
        try {
            const result = await runCaptionEditorAction(() => applyAutoCaptionPlacement(subtitles, true));
            if (result.error) throw result.error;
            renderSubtitleCards();
            syncSubtitlesOverlay();
            showToast(result.updated ? `Auto Place updated ${result.updated} caption positions.` : result.skipped || 'Caption positions are already up to date.');
        } catch (error) {
            console.error('Auto Place failed:', error);
            showToast(error.message || 'Auto Place could not complete.', 'error');
        }
    });

    // Add Segment card manually click
    addSegmentBtn.addEventListener('click', () => {
        const currentPlay = videoPlayer.currentTime;
        const newSeg = {
            start: Math.round(currentPlay * 100) / 100,
            end: Math.round((currentPlay + 2.5) * 100) / 100,
            text: "New word caption block"
        };
        subtitles.push(newSeg);
        subtitles.sort((a, b) => a.start - b.start);
        renderSubtitleCards();
        renderTimeline();
        syncSubtitlesOverlay();
        showToast("New caption segment block added.");
    });
}

function setCaptionActionsBusy(isBusy) {
    [smartPolishBtn, splitLongBtn, autoPlaceBtn].forEach(button => {
        button.disabled = isBusy;
    });
}

async function runCaptionEditorAction(action) {
    try {
        return await CaptionActions.withActionState(setCaptionActionsBusy, action);
    } finally {
        updateCaptionActionButtons();
    }
}

function updateCaptionActionButtons() {
    const hasCaptions = subtitles.length > 0;
    smartPolishBtn.disabled = !hasCaptions;
    splitLongBtn.disabled = !hasCaptions;
    autoPlaceBtn.disabled = !hasCaptions || !Number.isFinite(videoPlayer.duration);
}

// --- Import Video Selection Handler ---
function handleVideoSelect(file) {
    if (!file.type.startsWith('video/')) {
        showToast("Please choose a valid video file.", "error");
        return;
    }
    
    videoFile = file;
    videoUrl = URL.createObjectURL(file);
    
    // Set video src
    videoPlayer.src = videoUrl;
    videoPlayer.load();
    
    // Update Upload UI state
    uploadZone.classList.add('hidden');
    document.getElementById('media-info-box').classList.remove('hidden');
    document.getElementById('uploaded-file-name').textContent = file.name;
    
    // Show player
    playerContainer.classList.remove('empty-player-state');
    videoWrapper.classList.remove('hidden');
    playerPlaceholder.classList.add('hidden');
    stageToolbar.classList.remove('hidden');
    requestAnimationFrame(updateVideoStageLayout);
    
    // Advance progress indicator workflow
    if (stepNodes && stepNodes[1]) {
        stepNodes[1].classList.add('active'); // active Edit node
    }
    
    updateTranscribeButtonState();
    showToast("Video loaded successfully!");
}

function togglePlayPause() {
    if (videoPlayer.paused) {
        videoPlayer.play();
    } else {
        videoPlayer.pause();
    }
}

// --- Time formatting helper ---
function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatSubtitleTime(seconds, decimalSeparator = ',') {
    if (isNaN(seconds)) return "00:00:00,000";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = secs.toString().padStart(2, '0');
    const ms = milliseconds.toString().padStart(3, '0');
    
    return `${h}:${m}:${s}${decimalSeparator}${ms}`;
}

function parseTimeToSeconds(timeStr) {
    // Expected format: MM:SS.mmm or HH:MM:SS.mmm
    const parts = timeStr.replace(',', '.').split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
        return parts[0];
    }
    return 0;
}

function normalizeSubtitleSegments(segments) {
    return segments
        .map(seg => {
            const rawType = String(seg.type || 'speech').toLowerCase();
            const segmentType = ['music', 'song', 'instrumental', 'non_speech', 'non-speech'].includes(rawType) ? 'music' : 'speech';
            const cleanText = String(seg.text || '')
                .replace(/\s+/g, ' ')
                .replace(/\s+([,.!?;:])/g, '$1')
                .trim() || (segmentType === 'music' ? MUSIC_MARKER : '');
            const start = Math.max(0, Number(seg.start) || 0);
            const end = Math.max(start + 0.35, Number(seg.end) || (start + 1.8));

            return Object.assign({}, seg, {
                start: Math.round(start * 100) / 100,
                end: Math.round(end * 100) / 100,
                text: cleanText,
                speaker: String(seg.speaker || (segmentType === 'music' ? 'Music' : '')).trim(),
                type: segmentType
            });
        })
        .filter(seg => seg.text.length > 0)
        .sort((a, b) => a.start - b.start);
}

function splitLongCaptionSegments(segments, maxWords = 8, maxChars = 46) {
    return CaptionActions.splitLongSegments(segments, maxWords, maxChars);
}

async function smartPolishCaptions() {
    subtitles = splitLongCaptionSegments(normalizeSubtitleSegments(subtitles));
    applySmartStyler(subtitles);
    const placement = await applyAutoCaptionPlacement(subtitles, true);
    if (placement.error) throw placement.error;

    renderSubtitleCards();
    renderTimeline();
    syncSubtitlesOverlay();
    return placement;
}

async function finalizeGeneratedCaptions(allSegments) {
    subtitles = splitLongCaptionSegments(normalizeSubtitleSegments(allSegments));
    if (subtitles.length === 0) {
        throw new Error("No captions were detected. Try selecting the correct spoken language, increasing voice volume, or using Enhanced Captions for better recognition.");
    }

    applySmartStyler(subtitles);
    updateProgressStatus("Finding clean caption zones...", "Sampling video frames for automatic placement", 98);
    await applyAutoCaptionPlacement(subtitles);

    updateProgressStatus("Processing completed!", "Formatting subtitle segments", 100);
    showToast("Transcription generated successfully!");

    if (tabEditBtn) tabEditBtn.removeAttribute('disabled');
    if (tabStyleBtn) tabStyleBtn.removeAttribute('disabled');
    if (tabExportBtn) tabExportBtn.removeAttribute('disabled');

    if (stepNodes && stepNodes[2]) stepNodes[2].classList.add('active');
    if (stepNodes && stepNodes[3]) stepNodes[3].classList.add('active');

    navigateToPage('edit');

    renderSubtitleCards();
    renderTimeline();
    syncSubtitlesOverlay();

    videoPlayer.currentTime = 0;
    videoPlayer.play().catch(err => console.log("Autoplay waiting for click interaction"));
}

function canUseServerVideoTranscription() {
    return Boolean(window.FormData && window.fetch && videoFile);
}

// --- Update State of Transcribe Button ---
function updateTranscribeButtonState() {
    const engine = engineSelect.value;
    const hasKey = apiKeyInput.value.trim().length > 0;
    const hasVideo = videoFile !== null;
    
    if (engine === 'free' || engine === 'best') {
        transcribeBtn.disabled = !(hasVideo && !isTranscribing);
        if (!hasVideo) {
            transcribeHelpMsg.textContent = "Please import a video to generate captions.";
            transcribeHelpMsg.classList.remove('hidden');
        } else {
            transcribeHelpMsg.classList.add('hidden');
        }
    } else {
        transcribeBtn.disabled = !(hasKey && hasVideo && !isTranscribing);
        if (!hasVideo) {
            transcribeHelpMsg.textContent = "Please import a video to generate captions.";
            transcribeHelpMsg.classList.remove('hidden');
        } else if (!hasKey) {
            transcribeHelpMsg.textContent = "Please add your access key in advanced settings.";
            transcribeHelpMsg.classList.remove('hidden');
        } else {
            transcribeHelpMsg.classList.add('hidden');
        }
    }
}

// --- Transcription Engine Trigger ---
async function triggerTranscription() {
    if (isTranscribing || !videoFile) return;
    
    const engine = engineSelect.value;
    const key = apiKeyInput.value.trim();
    if ((engine === 'gemini' || engine === 'groq') && !key) {
        showToast("Access key required for this engine.", "error");
        return;
    }
    
    isTranscribing = true;
    updateTranscribeButtonState();
    
    // Show progress, hide button container
    transcribeBtn.parentNode.classList.add('hidden');
    progressIndicator.classList.remove('hidden');
    subProgressFill.style.width = '0%';
    startFunnyProgressMessages();
    
    updateProgressStatus("Uploading video...", "Sending video to the faster server processor", 5);
    
    try {
        if (canUseServerVideoTranscription()) {
            try {
                const serverSegments = await transcribeVideoOnServer(videoFile, key, languageSelect.value, modelSelect.value, engine);
                await finalizeGeneratedCaptions(serverSegments);
                return;
            } catch (serverErr) {
                const duration = videoPlayer.duration || 0;
                if (duration > 1800) {
                    throw serverErr;
                }
                console.warn("Server video transcription failed, falling back to browser audio path:", serverErr);
                updateProgressStatus("Retrying locally...", "Falling back to browser audio extraction", 12);
            }
        }

        updateProgressStatus("Reading video file...", "Preparing file array buffer", 15);

        // Step 1: Read video array buffer
        const arrayBuffer = await readFileAsArrayBuffer(videoFile);
        
        updateProgressStatus("Extracting audio track...", "Preparing the audio from your reel", 15);
        
        // Step 2: Decode audio track using Web Audio API
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let decodedBuffer;
        try {
            decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        } catch (decodeErr) {
            throw new Error("Failed to decode video audio track. The format might not be supported by your browser's audio engine.");
        }
        
        audioCtx.close(); // Clean up context
        
        updateProgressStatus("Resampling audio...", "Downsampling to 16kHz mono PCM", 40);
        
        // Step 3: Resample to 16kHz mono using OfflineAudioContext
        const resampledBuffer = await resampleAudioBuffer(decodedBuffer, 16000);
        
        updateProgressStatus("Formatting audio...", "Creating 16-bit PCM WAV chunks", 50);
        
        // Step 4: Chunking logic to keep each recognition request manageable.
        const chunkDurationSecs = 300; // 5 minutes
        const sampleRate = resampledBuffer.sampleRate;
        const totalDuration = resampledBuffer.duration;
        const chunkSize = chunkDurationSecs * sampleRate;
        const totalSamples = resampledBuffer.length;
        
        const wavChunks = [];
        const channelData = resampledBuffer.getChannelData(0);
        
        for (let offset = 0; offset < totalSamples; offset += chunkSize) {
            const end = Math.min(offset + chunkSize, totalSamples);
            const chunkLength = end - offset;
            
            // Build a small float32 array for this chunk
            const chunkData = channelData.subarray(offset, end);
            
            // Convert chunk to WAV Blob
            const wavBlob = encodeWAV(chunkData, sampleRate);
            
            wavChunks.push({
                blob: wavBlob,
                offsetSeconds: offset / sampleRate
            });
        }
        
        // Step 5: Transcribe each chunk sequentially
        const allSegments = [];
        const selectedLanguage = languageSelect.value;
        const selectedModel = modelSelect.value;
        
        for (let i = 0; i < wavChunks.length; i++) {
            const chunk = wavChunks[i];
            const partNum = i + 1;
            const totalParts = wavChunks.length;
            
            const statusDesc = (engine === 'free' || engine === 'best')
                ? `Listening closely to this part of your reel`
                : `Enhancing captions for this part of your reel`;
                
            updateProgressStatus(
                `Transcribing audio (Part ${partNum}/${totalParts})...`,
                statusDesc,
                50 + Math.floor((partNum / totalParts) * 45)
            );
            
            const chunkSubtitles = await uploadAndTranscribe(chunk.blob, key, selectedLanguage, selectedModel, engine);
            
            // Adjust timestamps by the offset of this chunk
            const adjusted = chunkSubtitles.map(seg => ({
                start: seg.start + chunk.offsetSeconds,
                end: seg.end + chunk.offsetSeconds,
                text: seg.text,
                speaker: seg.speaker || '',
                type: seg.type || 'speech'
            }));
            
            allSegments.push(...adjusted);
        }
        
        await finalizeGeneratedCaptions(allSegments);
        
    } catch (err) {
        console.error(err);
        showToast(err.message || "An error occurred during transcription.", "error");
    } finally {
        isTranscribing = false;
        stopFunnyProgressMessages();
        // Restore buttons
        transcribeBtn.parentNode.classList.remove('hidden');
        progressIndicator.classList.add('hidden');
        updateTranscribeButtonState();
    }
}

// --- FileReader Helper ---
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file contents."));
        reader.readAsArrayBuffer(file);
    });
}

// --- Resampling Web Audio API Helper ---
async function resampleAudioBuffer(audioBuffer, targetSampleRate) {
    const numChannels = 1; // force mono
    const duration = audioBuffer.duration;
    const length = duration * targetSampleRate;
    
    // OfflineAudioContext renders as fast as the hardware can go
    const offlineCtx = new OfflineAudioContext(numChannels, length, targetSampleRate);
    
    // Create source buffer
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    return await offlineCtx.startRendering();
}

// --- Pure JS WAV Encoder ---
function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw PCM is 1) */
    view.setUint16(20, 1, true);
    /* channel count (1 mono) */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample (16) */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);
    
    // Write Float32 samples as signed 16-bit integers
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function updateProgressStatus(title, desc, percent) {
    const friendlyTitle = percent >= 100
        ? "Your captions are ready"
        : "We are transcribing your file...";
    progressStatusTitle.textContent = friendlyTitle;
    progressStatusDesc.textContent = desc;
    subProgressFill.style.width = `${percent}%`;
}

// --- Upload to Backend API Helper ---
async function uploadAndTranscribe(wavBlob, apiKey, language, model, engine) {
    const formData = new FormData();
    formData.append('audio', wavBlob, 'audio.wav');
    formData.append('language', language);
    formData.append('model', model);
    formData.append('engine', engine);
    if (engine === 'gemini' || engine === 'groq') {
        formData.append('api_key', apiKey);
    }

    const headers = {};
    if (engine === 'gemini' || engine === 'groq') {
        headers['X-API-Key'] = apiKey;
    }

    const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: headers,
        body: formData
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || "Server transcription request failed.");
    }

    if (result.engineResults) {
        engineResults = result.engineResults;
        displayEngineStatus(engineResults);
    } else {
        engineResults = null;
        displayEngineStatus(null);
    }

    if (result.subtitles) {
        return result.subtitles;
    } else if (result.text_response) {
        try {
            const match = result.text_response.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (match) {
                return JSON.parse(match[0]);
            }
        } catch (e) {}
        throw new Error("Unable to turn the transcript into timeline blocks. Try generating captions again.");
    }
    
    throw new Error("The caption response was not readable. Please try again.");
}

async function transcribeVideoOnServer(file, apiKey, language, model, engine) {
    const formData = new FormData();
    formData.append('video', file, file.name || 'video.mp4');
    formData.append('language', language);
    formData.append('model', model);
    formData.append('engine', engine);
    formData.append('duration', String(videoPlayer.duration || 0));
    if (engine === 'gemini' || engine === 'groq') {
        formData.append('api_key', apiKey);
    }

    const headers = {};
    if (engine === 'gemini' || engine === 'groq') {
        headers['X-API-Key'] = apiKey;
    }

    const startResponse = await fetch('/api/transcribe-video', {
        method: 'POST',
        headers,
        body: formData
    });

    const startResult = await startResponse.json();
    if (!startResponse.ok) {
        throw new Error(startResult.error || "Server video processing could not start.");
    }

    const jobId = startResult.job_id;
    if (!jobId) {
        throw new Error("Server did not return a processing job.");
    }

    let lastProgress = startResult.progress || 2;
    updateProgressStatus("Preparing video audio...", "Server is extracting clean audio chunks", lastProgress);

    while (true) {
        await wait(1800);
        const statusResponse = await fetch(`/api/transcribe-video/${encodeURIComponent(jobId)}`);
        const status = await statusResponse.json();
        if (!statusResponse.ok) {
            throw new Error(status.error || "Could not read video processing progress.");
        }

        lastProgress = Math.max(lastProgress, Number(status.progress) || lastProgress);
        updateProgressStatus("Transcribing video...", status.message || "Processing audio chunks", Math.min(lastProgress, 96));

        if (status.status === 'complete') {
            if (status.engineResults) {
                engineResults = status.engineResults;
                displayEngineStatus(engineResults);
            } else {
                engineResults = null;
                displayEngineStatus(null);
            }
            return status.subtitles || [];
        }
        if (status.status === 'error') {
            throw new Error(status.message || "Video transcription failed.");
        }
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function displayEngineStatus(results) {
    const statusEl = document.getElementById('caption-engine-status');
    if (!statusEl) return;
    if (!results) {
        statusEl.classList.add('hidden');
        return;
    }
    statusEl.classList.remove('hidden');
    let text = `<strong>Selected Engine:</strong> ${results.selected.toUpperCase()}`;
    if (results.warnings && results.warnings.length > 0) {
        text += `<br><span style="color: var(--danger); font-size: 0.8rem; display: block; margin-top: 4px;">⚠️ ${results.warnings.join(', ')}</span>`;
    }
    statusEl.innerHTML = text;
}

// Smart Emojis Dictionary for Social Media Captioning
const emojiDict = {
    fire: "\u{1F525}", hot: "\u{1F525}", cool: "\u{1F525}", burn: "\u{1F525}", awesome: "\u{1F525}", lit: "\u{1F525}",
    rocket: "\u{1F680}", launch: "\u{1F680}", fast: "\u{1F680}", speed: "\u{1F680}", build: "\u{1F680}",
    money: "\u{1F4B5}", rich: "\u{1F4B5}", dollar: "\u{1F4B5}", cash: "\u{1F4B5}", earn: "\u{1F4B5}", profit: "\u{1F4B5}", pay: "\u{1F4B5}",
    love: "\u2764\uFE0F", heart: "\u2764\uFE0F", like: "\u2764\uFE0F", cute: "\u2764\uFE0F",
    laugh: "\u{1F602}", funny: "\u{1F602}", joke: "\u{1F602}", lol: "\u{1F602}", hilarious: "\u{1F602}",
    target: "\u{1F3AF}", goal: "\u{1F3AF}", aim: "\u{1F3AF}", focus: "\u{1F3AF}", key: "\u{1F511}",
    warning: "\u26A0\uFE0F", caution: "\u26A0\uFE0F", alert: "\u26A0\uFE0F", danger: "\u26A0\uFE0F",
    brain: "\u{1F4A1}", think: "\u{1F4A1}", mind: "\u{1F4A1}", idea: "\u{1F4A1}", smart: "\u{1F4A1}", learn: "\u{1F4A1}",
    success: "\u{1F3C6}", winner: "\u{1F3C6}", win: "\u{1F3C6}", trophy: "\u{1F3C6}", prize: "\u{1F3C6}",
    clock: "\u23F0", time: "\u23F0", watch: "\u23F0", wait: "\u23F0", history: "\u23F0",
    music: "\u{1F3B5}", song: "\u{1F3B5}", sound: "\u{1F3B5}", voice: "\u{1F3B5}", audio: "\u{1F3B5}",
    video: "\u{1F4F9}", camera: "\u{1F4F9}", movie: "\u{1F4F9}", shoot: "\u{1F4F9}", clip: "\u{1F4F9}",
    happy: "\u{1F60A}", smile: "\u{1F60A}", glad: "\u{1F60A}", fun: "\u{1F60A}",
    sad: "\u{1F622}", cry: "\u{1F622}", hurt: "\u{1F622}", sorry: "\u{1F622}",
    angry: "\u{1F620}", mad: "\u{1F620}", hate: "\u{1F620}",
    yes: "\u2705", correct: "\u2705", agree: "\u2705", done: "\u2705", ok: "\u2705",
    no: "\u274C", wrong: "\u274C", false: "\u274C", error: "\u274C", fail: "\u274C",
    star: "\u2728", bright: "\u2728", magic: "\u2728", clean: "\u2728", look: "\u2728",
    water: "\u{1F30A}", sea: "\u{1F30A}", ocean: "\u{1F30A}", blue: "\u{1F30A}",
    phone: "\u{1F4F1}", mobile: "\u{1F4F1}", call: "\u{1F4F1}", app: "\u{1F4F1}",
    world: "\u{1F30D}", earth: "\u{1F30D}", globe: "\u{1F30D}", space: "\u{1F30D}",
    secret: "\u{1F511}", unlock: "\u{1F511}", code: "\u{1F511}"
};
function getSmartEmojis(text) {
    if (!text) return '';
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    for (const w of words) {
        if (emojiDict[w]) {
            return emojiDict[w];
        }
    }
    return '';
}

// --- Subtitles Overlay Renderer & Sync ---
let lastText = '';
const captionAnimationClasses = [
    'anim-pop',
    'anim-slide',
    'anim-glitch',
    'anim-pulse',
    'anim-type',
    'anim-flip',
    'anim-wave',
    'anim-zoom'
];

function clearCaptionAnimationClasses() {
    subtitlesOverlayText.classList.remove(...captionAnimationClasses);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const speakerPalette = [
    '#fff36d',
    '#ff72b6',
    '#7bdcff',
    '#a6ff8f',
    '#ffb15f',
    '#d2a2ff'
];

function stableHash(value) {
    return String(value || '').split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
}

function getSegmentAccentColor(segment) {
    if (!segment) return '';
    if (segment.type === 'music') return '#ffd84d';
    if (!segment.speaker) return '';
    const paletteIndex = Math.abs(stableHash(segment.speaker)) % speakerPalette.length;
    return speakerPalette[paletteIndex];
}

function getMusicCaptionText(segment) {
    const text = String(segment && segment.text ? segment.text : '').trim();
    if (text && /[\u266a\u266b\ud83c\udfb5\ud83c\udfb6]/.test(text)) return text;
    return MUSIC_MARKER;
}

function applySegmentTone(segment, styleSource) {
    if (!segment) return;
    const accentColor = getSegmentAccentColor(segment);
    if (!accentColor) return;

    subtitlesOverlayText.style.color = accentColor;
    if (segment.type === 'music') {
        subtitlesOverlayText.style.textShadow = '0 0 14px rgba(255, 216, 77, 0.72), 0 10px 24px rgba(0,0,0,0.72)';
        subtitlesOverlayText.style.webkitTextStroke = '0';
    } else if (styleSource && styleSource.highlightColor !== 'none') {
        subtitlesOverlayText.style.setProperty('--speaker-color', accentColor);
    }
}

function applySmartCaptionLineBreak(text) {
    const words = String(text).split(/\s+/).filter(Boolean);
    if (words.length < 5 || text.length < 24) return text;

    const totalChars = words.reduce((sum, word) => sum + word.length, 0) + words.length - 1;
    let bestIndex = Math.floor(words.length / 2);
    let bestDistance = Infinity;
    let runningChars = 0;

    for (let i = 1; i < words.length; i++) {
        runningChars += words[i - 1].length + (i > 1 ? 1 : 0);
        if (i < 2 || words.length - i < 2) continue;

        const distance = Math.abs((totalChars / 2) - runningChars);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
        }
    }

    return `${words.slice(0, bestIndex).join(' ')}\n${words.slice(bestIndex).join(' ')}`;
}

function renderCaptionWordSpans(text, orientation = 'horizontal') {
    const isVertical = orientation === 'vertical-left' || orientation === 'vertical-right';

    if (isVertical) {
        let wordIndex = 0;
        return String(text)
            .split('\n')
            .map(line => {
                const words = line.split(/\s+/).filter(Boolean);
                const groups = [];
                let group = [];
                let chars = 0;

                words.forEach(word => {
                    const nextChars = chars + word.length + (group.length ? 1 : 0);
                    if (group.length && (group.length >= 3 || nextChars > 16)) {
                        groups.push(group);
                        group = [];
                        chars = 0;
                    }
                    group.push(word);
                    chars += word.length + (group.length > 1 ? 1 : 0);
                });

                if (group.length) groups.push(group);

                return groups
                    .map(groupWords => groupWords
                        .map(word => `<span class="cc-word" data-word-idx="${wordIndex++}">${escapeHtml(word)}</span>`)
                        .join(' '))
                    .join('<br>');
            })
            .join('<br>');
    }

    return String(text)
        .split('\n')
        .map(line => line
            .split(/\s+/)
            .filter(Boolean)
            .map((word, idx) => `<span class="cc-word" data-word-idx="${idx}">${escapeHtml(word)}</span>`)
            .join(isVertical ? '<br>' : ' '))
        .join('<br>');
}

function syncSubtitlesOverlay() {
    if (!subtitleOverlayVisible) {
        subtitlesOverlay.classList.add('hidden');
        return;
    }

    const currTime = videoPlayer.currentTime;
    const activeSeg = subtitles.find(seg => currTime >= seg.start && currTime <= seg.end);
    
    // Style tab can edit selected segment styles, but the overlay only shows real active captions.
    const styleTab = document.getElementById('style-tab');
    const isStyleTabActive = styleTab && styleTab.classList.contains('active');

    // Resolve dynamic styling context
    let styleSource = captionStyle;
    if (activeSeg && activeSeg.style) {
        styleSource = activeSeg.style;
    } else if (isStyleTabActive && styleTargetMode === 'segment' && activeSegmentIndex !== -1 && subtitles[activeSegmentIndex]) {
        if (!subtitles[activeSegmentIndex].style) {
            subtitles[activeSegmentIndex].style = Object.assign({}, captionStyle);
        }
        styleSource = subtitles[activeSegmentIndex].style;
    }

    if (activeSeg) {
        if (updateLiveAutoPlacement(activeSeg, styleSource)) {
            updateOverlayClasses(styleSource, true);
        }

        let text = activeSeg.text;
        const orientation = getEffectivePlacement(styleSource).orientation || 'horizontal';
        const isMusicSegment = activeSeg.type === 'music';
        
        // Prepare text casing
        let displayCasedText = isMusicSegment ? getMusicCaptionText(activeSeg) : text;
        if (!isMusicSegment && styleSource.casing === 'uppercase') {
            displayCasedText = text.toUpperCase();
        } else if (!isMusicSegment && styleSource.casing === 'titlecase') {
            displayCasedText = toTitleCase(text);
        }
        if (!isMusicSegment && !(orientation === 'vertical-left' || orientation === 'vertical-right')) {
            displayCasedText = applySmartCaptionLineBreak(displayCasedText);
        }
        
        const renderKey = `${activeSeg.type || 'speech'}|${orientation}|${displayCasedText}`;
        if (lastText !== renderKey) {
            const emojis = !isMusicSegment && styleSource.smartEmojis ? getSmartEmojis(text) : '';
            
            let htmlContent = isMusicSegment
                ? `<span class="music-caption">${escapeHtml(displayCasedText)}</span>`
                : renderCaptionWordSpans(displayCasedText, orientation);
            if (emojis) {
                htmlContent += ` <span class="cc-emoji">${emojis}</span>`;
            }
            
            subtitlesOverlayText.innerHTML = htmlContent;
            
            // Reset and apply selected animation
            clearCaptionAnimationClasses();
            void subtitlesOverlayText.offsetWidth; // Force reflow
            
            if (styleSource.animation && styleSource.animation !== 'none') {
                subtitlesOverlayText.classList.add(`anim-${styleSource.animation}`);
            }
            
            lastText = renderKey;
        }

        applySegmentTone(activeSeg, styleSource);
        scheduleCaptionFit();
        
        // Update active highlighted word (Karaoke Highlight)
        const wordEls = subtitlesOverlayText.querySelectorAll('.cc-word');
        if (wordEls.length > 0) {
            const duration = activeSeg.end - activeSeg.start;
            const elapsed = currTime - activeSeg.start;
            let activeWordIdx = Math.floor((elapsed / (duration || 1)) * wordEls.length);
            activeWordIdx = Math.max(0, Math.min(activeWordIdx, wordEls.length - 1));
            
            wordEls.forEach((el, idx) => {
                if (idx === activeWordIdx && styleSource.highlightColor !== 'none') {
                    el.classList.add('active-word');
                    el.style.setProperty('--highlight-color', styleSource.highlightColor);
                    if (styleSource.wordPop) {
                        el.classList.add('word-pop');
                    } else {
                        el.classList.remove('word-pop');
                    }
                } else {
                    el.classList.remove('active-word', 'word-pop');
                }
            });
        }
        
        subtitlesOverlay.classList.remove('hidden');
        scheduleCaptionFit();
    } else {
        subtitlesOverlay.classList.add('hidden');
        lastText = '';
    }
}

// Title Case helper
function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

// --- Highlight active card in editor tab ---
function highlightActiveEditorCard() {
    const currTime = videoPlayer.currentTime;
    const activeIndex = subtitles.findIndex(seg => currTime >= seg.start && currTime <= seg.end);
    
    const cards = captionsList.querySelectorAll('.caption-edit-card');
    cards.forEach((card, idx) => {
        if (idx === activeIndex) {
            card.classList.add('active');
            // Scroll it into view if not visible in editor pane
            if (document.activeElement !== card.querySelector('.card-content-area textarea') && 
                document.activeElement !== card.querySelectorAll('.timing-input')[0] &&
                document.activeElement !== card.querySelectorAll('.timing-input')[1]) {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            card.classList.remove('active');
        }
    });
}

// --- Render Subtitle Edit Cards ---
function renderSubtitleCards() {
    captionsList.innerHTML = '';
    segmentCount.textContent = subtitles.length;
    updateCaptionActionButtons();

    if (subtitles.length === 0) {
        captionsList.innerHTML = `
            <div class="empty-list-msg">
                <p>No captions loaded. Generate captions or add manually to edit.</p>
            </div>
        `;
        updateTranscriptPreview();
        return;
    }

    subtitles.forEach((seg, index) => {
        const card = document.createElement('div');
        card.className = 'caption-edit-card';
        if (index === activeSegmentIndex) {
            card.classList.add('selected-active');
        }
        card.dataset.index = index;
        
        card.innerHTML = `
            <div class="card-timings">
                <div class="timing-field">
                    <span>In:</span>
                    <input type="text" class="timing-input start-time-input" value="${formatSubtitleTime(seg.start, '.').substring(3, 11)}">
                </div>
                <div class="timing-field">
                    <span>Out:</span>
                    <input type="text" class="timing-input end-time-input" value="${formatSubtitleTime(seg.end, '.').substring(3, 11)}">
                </div>
            </div>
            <div class="card-content-area" style="position: relative; display: flex; align-items: center; width: 100%;">
                <textarea rows="1" style="flex: 1; padding-right: 28px;">${escapeHtml(seg.text)}</textarea>
                ${seg.style ? `<span class="card-override-badge" title="Has custom segment styles" style="position: absolute; right: 8px; cursor: pointer;">*</span>` : ''}
            </div>
            <div class="card-actions">
                <button class="delete-card-btn" title="Delete segment">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;

        // Click on card seeking player and selecting segment styling target
        card.addEventListener('click', (e) => {
            activeSegmentIndex = index;
            styleTargetSegment.removeAttribute('disabled');
            
            // Highlight selected card visually
            captionsList.querySelectorAll('.caption-edit-card').forEach(c => c.classList.remove('selected-active'));
            card.classList.add('selected-active');

            if (styleTargetMode === 'segment') {
                initStyleControls();
            }

            if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT' && !e.target.closest('.delete-card-btn')) {
                videoPlayer.currentTime = seg.start;
                if (videoPlayer.paused) {
                    videoPlayer.play();
                }
            }
        });

        // Sync Text Changes
        const textarea = card.querySelector('.card-content-area textarea');
        textarea.addEventListener('input', () => {
            subtitles[index].text = textarea.value;
            syncSubtitlesOverlay();
            renderTimeline();
        });
        
        textarea.addEventListener('focus', () => {
            textarea.rows = 2;
        });
        textarea.addEventListener('blur', () => {
            textarea.rows = 1;
        });

        // Sync Start Time Changes
        const startInput = card.querySelector('.start-time-input');
        startInput.addEventListener('change', () => {
            const rawVal = startInput.value;
            const parsedSeconds = parseTimeToSeconds(rawVal);
            if (!isNaN(parsedSeconds) && parsedSeconds >= 0 && parsedSeconds <= seg.end) {
                subtitles[index].start = parsedSeconds;
                subtitles.sort((a, b) => a.start - b.start);
                renderSubtitleCards();
                renderTimeline();
            } else {
                startInput.value = formatSubtitleTime(seg.start, '.').substring(3, 11);
                showToast("Invalid start time entered.", "error");
            }
        });

        // Sync End Time Changes
        const endInput = card.querySelector('.end-time-input');
        endInput.addEventListener('change', () => {
            const rawVal = endInput.value;
            const parsedSeconds = parseTimeToSeconds(rawVal);
            if (!isNaN(parsedSeconds) && parsedSeconds >= seg.start && parsedSeconds <= (videoPlayer.duration || 99999)) {
                subtitles[index].end = parsedSeconds;
                renderSubtitleCards();
                renderTimeline();
            } else {
                endInput.value = formatSubtitleTime(seg.end, '.').substring(3, 11);
                showToast("Invalid end time entered.", "error");
            }
        });

        // Delete Button Click
        const deleteBtn = card.querySelector('.delete-card-btn');
        deleteBtn.addEventListener('click', () => {
            subtitles.splice(index, 1);
            renderSubtitleCards();
            renderTimeline();
            syncSubtitlesOverlay();
            showToast("Segment deleted.");
        });

        captionsList.appendChild(card);
    });
    updateTranscriptPreview();
}

// --- Render Timeline blocks ---
function renderTimeline() {
    if (!captionTrackContent) return;
    
    // Clear tracks
    captionTrackContent.innerHTML = '';
    
    if (subtitles.length === 0) {
        captionTrackContent.innerHTML = `<div class="caption-track-empty">Timeline empty. Generate captions to build caption tracks.</div>`;
        videoTrackBlock.textContent = 'Upload video to render video track...';
        return;
    }
    
    // Set video duration labels
    videoTrackBlock.textContent = `Video Media (${formatTime(videoPlayer.duration)})`;
    
    // Calculate timeline zoom scale width
    const zoomVal = parseInt(timelineZoomSlider.value) || 5;
    const pxPerSecond = zoomVal * 15; // 15px to 150px per second representation
    
    const timelineWidth = videoPlayer.duration * pxPerSecond;
    document.getElementById('video-track-content').style.width = `${timelineWidth}px`;
    captionTrackContent.style.width = `${timelineWidth}px`;
    document.getElementById('timeline-ruler').style.width = `${timelineWidth}px`;
    
    // Draw ruler labels
    const ruler = document.getElementById('timeline-ruler');
    ruler.innerHTML = '';
    const step = Math.max(1, Math.round(100 / pxPerSecond)); // label intervals
    for (let sec = 0; sec < videoPlayer.duration; sec += step) {
        const mark = document.createElement('span');
        mark.className = 'ruler-mark';
        mark.style.left = `${sec * pxPerSecond}px`;
        mark.style.position = 'absolute';
        mark.style.fontSize = '0.65rem';
        mark.style.color = 'var(--text-muted)';
        mark.style.paddingTop = '2px';
        mark.style.fontFamily = 'var(--font-code)';
        mark.textContent = formatTime(sec);
        ruler.appendChild(mark);
    }
    
    // Render blocks
    subtitles.forEach((seg, idx) => {
        const block = document.createElement('div');
        block.className = 'timeline-segment-block';
        block.dataset.index = idx;
        
        const leftOffset = seg.start * pxPerSecond;
        const blockWidth = (seg.end - seg.start) * pxPerSecond;
        
        block.style.left = `${leftOffset}px`;
        block.style.width = `${blockWidth}px`;
        block.textContent = seg.text;
        
        // Seek playhead on click timeline block
        block.addEventListener('click', () => {
            videoPlayer.currentTime = seg.start;
            if (videoPlayer.paused) {
                videoPlayer.play();
            }
        });
        
        captionTrackContent.appendChild(block);
    });
}

function updateTimelinePlayhead() {
    if (!timelinePlayhead || !videoPlayer.duration) return;
    
    const zoomVal = parseInt(timelineZoomSlider.value) || 5;
    const pxPerSecond = zoomVal * 15;
    
    const leftOffset = videoPlayer.currentTime * pxPerSecond;
    timelinePlayhead.style.left = `${leftOffset}px`;
    
    // Auto-scroll timeline container to match playhead
    const timelineRect = timelineWorkspace.getBoundingClientRect();
    const playheadPos = leftOffset - timelineWorkspace.scrollLeft;
    
    if (playheadPos > timelineRect.width * 0.75 || playheadPos < 50) {
        timelineWorkspace.scrollLeft = leftOffset - (timelineRect.width * 0.25);
    }
}

function updateTranscriptPreview() {
    const previewBox = document.getElementById('transcript-preview-box');
    if (!previewBox) return;
    
    if (subtitles.length === 0) {
        previewBox.textContent = "Generate captions to see transcript preview here...";
        return;
    }
    
    const fullText = subtitles.map(s => s.text).join(' ');
    previewBox.textContent = fullText;
}

function formatAssTime(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = Math.floor(safeSeconds % 60);
    const centiseconds = Math.floor((safeSeconds % 1) * 100);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

function assEscape(text) {
    return String(text || '')
        .replace(/[{}]/g, '')
        .replace(/\r?\n/g, '\\N')
        .replace(/,/g, '\uFF0C');
}

function assAlignment(position) {
    if (position === 'top') return 8;
    if (position === 'center') return 5;
    return 2;
}

function hexToAssColor(hex, fallback = '&H00FFFFFF') {
    if (!hex || hex === 'preset' || hex === 'none' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return fallback;
    const r = hex.slice(1, 3);
    const g = hex.slice(3, 5);
    const b = hex.slice(5, 7);
    return `&H00${b}${g}${r}`;
}

// --- Export Subtitles Engine ---
function exportSubtitles(format) {
    if (subtitles.length === 0) {
        showToast("No subtitles to export.", "error");
        return;
    }

    let fileContent = '';
    let mimeType = 'text/plain';
    let extension = 'txt';
    const videoName = videoFile ? videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) : 'captions';

    switch (format) {
        case 'srt':
            mimeType = 'text/srt';
            extension = 'srt';
            subtitles.forEach((seg, index) => {
                fileContent += `${index + 1}\r\n`;
                fileContent += `${formatSubtitleTime(seg.start, ',')} --> ${formatSubtitleTime(seg.end, ',')}\r\n`;
                fileContent += `${seg.text}\r\n\r\n`;
            });
            break;
            
        case 'vtt':
            mimeType = 'text/vtt';
            extension = 'vtt';
            fileContent = 'WEBVTT\r\n\r\n';
            subtitles.forEach((seg, index) => {
                fileContent += `${index + 1}\r\n`;
                fileContent += `${formatSubtitleTime(seg.start, '.')} --> ${formatSubtitleTime(seg.end, '.')}\r\n`;
                fileContent += `${seg.text}\r\n\r\n`;
            });
            break;
            
        case 'txt':
            mimeType = 'text/plain';
            extension = 'txt';
            subtitles.forEach((seg) => {
                fileContent += `${seg.text} `;
            });
            fileContent = fileContent.trim();
            break;
            
        case 'json':
            mimeType = 'application/json';
            extension = 'json';
            fileContent = JSON.stringify(subtitles, null, 2);
            break;

        case 'ass':
            mimeType = 'text/plain';
            extension = 'ass';
            fileContent = [
                '[Script Info]',
                'ScriptType: v4.00+',
                'PlayResX: 1080',
                'PlayResY: 1920',
                'ScaledBorderAndShadow: yes',
                '',
                '[V4+ Styles]',
                'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
                'Style: Default,Montserrat,82,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,5,2,2,60,60,160,1',
                '',
                '[Events]',
                'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
            ].join('\r\n') + '\r\n';

            subtitles.forEach((seg) => {
                const style = seg.style || captionStyle;
                const font = String(style.fontFamily || 'Montserrat').split(',')[0].replace(/['"]/g, '').trim();
                const size = Math.round((Number(style.size) || 1.6) * 46);
                const primary = hexToAssColor(style.color === 'preset' ? null : style.color);
                const outline = style.stroke === 'none' ? 0 : Math.max(2, parseInt(style.stroke, 10) || 4);
                const shadow = style.shadow === 'none' ? 0 : 2;
                const alignment = assAlignment(style.position);
                let assText = seg.text;
                if (style.casing === 'uppercase') {
                    assText = seg.text.toUpperCase();
                } else if (style.casing === 'titlecase') {
                    assText = toTitleCase(seg.text);
                }
                const text = assEscape(applySmartCaptionLineBreak(assText));
                const overrides = `{\\fn${font}\\fs${size}\\c${primary}\\bord${outline}\\shad${shadow}\\an${alignment}}`;
                fileContent += `Dialogue: 0,${formatAssTime(seg.start)},${formatAssTime(seg.end)},Default,,0,0,0,,${overrides}${text}\r\n`;
            });
            break;
    }

    // Download Trigger
    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoName}_subtitles.${extension}`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded successfully as .${extension.toUpperCase()}!`);
}
window.exportSubtitles = exportSubtitles;

// --- Smart Mode Auto-Styler Configurations & Logic ---
const stylingPresets = {
    hormozi: {
        preset: 'hormozi',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        size: 1.58,
        casing: 'uppercase',
        animation: 'pop',
        highlightColor: '#ffd84d',
        stroke: '1px rgba(0,0,0,0.72)',
        shadow: 'none',
        bg: 'none',
        tilt: 0,
        spacing: 0,
        bold: true,
        italic: false
    },
    bouncy: {
        preset: 'bouncy',
        fontFamily: "'Fredoka', sans-serif",
        size: 1.62,
        casing: 'uppercase',
        animation: 'wave',
        highlightColor: '#ffd84d',
        stroke: '1px rgba(0,0,0,0.78)',
        shadow: 'none',
        bg: 'none',
        tilt: -2,
        spacing: 0,
        bold: true,
        italic: false
    },
    neon: {
        preset: 'neon',
        fontFamily: "'Space Grotesk', sans-serif",
        size: 1.48,
        casing: 'uppercase',
        animation: 'pulse',
        highlightColor: '#00e5ff',
        stroke: 'none',
        shadow: 'glow-cyan',
        bg: 'none',
        tilt: 0,
        spacing: 0,
        bold: true,
        italic: false
    },
    minimal: {
        preset: 'minimal',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        size: 1.42,
        casing: 'original',
        animation: 'slide',
        highlightColor: '#ffd84d',
        stroke: 'none',
        shadow: 'none',
        bg: 'pill',
        tilt: 0,
        spacing: 0,
        bold: false,
        italic: false
    },
    cyber: {
        preset: 'cyber',
        fontFamily: "'Space Grotesk', sans-serif",
        size: 1.48,
        casing: 'uppercase',
        animation: 'type',
        highlightColor: '#39ffc9',
        stroke: 'none',
        shadow: 'glow-green',
        bg: 'none',
        tilt: 0,
        spacing: 0,
        bold: true,
        italic: false
    },
    cinematic: {
        preset: 'cinematic',
        fontFamily: "'DM Serif Display', serif",
        size: 1.5,
        casing: 'titlecase',
        animation: 'slide',
        highlightColor: '#f8d36a',
        stroke: 'none',
        shadow: 'shadow',
        bg: 'none',
        tilt: 0,
        spacing: 1,
        bold: true,
        italic: false
    },
    comic: {
        preset: 'comic',
        fontFamily: "'Fredoka', sans-serif",
        size: 1.58,
        casing: 'uppercase',
        animation: 'wave',
        highlightColor: '#ff4081',
        stroke: '1px rgba(0,0,0,0.78)',
        shadow: 'none',
        bg: 'none',
        tilt: 0,
        spacing: 0,
        bold: true,
        italic: false
    },
    luxury: {
        preset: 'luxury',
        fontFamily: "'Playfair Display', serif",
        size: 1.48,
        casing: 'titlecase',
        animation: 'type',
        highlightColor: '#f8d36a',
        stroke: 'none',
        shadow: 'shadow',
        bg: 'none',
        tilt: 0,
        spacing: 1,
        bold: true,
        italic: false
    },
    stamp: {
        preset: 'stamp',
        fontFamily: "'Oswald', sans-serif",
        size: 1.52,
        casing: 'uppercase',
        animation: 'flip',
        highlightColor: '#ff9800',
        stroke: '1px rgba(0,0,0,0.7)',
        shadow: 'none',
        bg: 'none',
        tilt: 0,
        spacing: 0,
        bold: true,
        italic: false
    }
};

function applyPresetDefaults(presetName) {
    const defaults = stylingPresets[presetName] || stylingPresets.hormozi;
    Object.entries(defaults).forEach(([key, value]) => {
        updateStyleProperty(key, value);
    });
}

function applySmartStyler(subtitlesArray) {
    const presetKeys = ['minimal', 'hormozi', 'cinematic', 'bouncy', 'neon'];
    
    subtitlesArray.forEach((seg, idx) => {
        if (seg.type === 'music') {
            seg.style = Object.assign({}, stylingPresets.cinematic, {
                position: 'auto',
                orientation: 'horizontal',
                animation: 'wave',
                size: 1.9,
                color: '#ffd84d',
                stroke: 'none',
                bg: 'none',
                wordPop: false,
                smartEmojis: false
            });
            return;
        }

        const textLower = seg.text.toLowerCase();
        let selectedPreset = 'hormozi'; // default fallback
        
        if (textLower.includes('crazy') || textLower.includes('bouncy') || textLower.includes('pop') || textLower.includes('fun') || textLower.includes('gaming') || textLower.includes('play') || textLower.includes('funny') || textLower.includes('joke')) {
            selectedPreset = 'bouncy';
        } else if (textLower.includes('cyber') || textLower.includes('digital') || textLower.includes('future') || textLower.includes('neon') || textLower.includes('tech') || textLower.includes('ai')) {
            selectedPreset = 'cyber';
        } else if (textLower.includes('important') || textLower.includes('key') || textLower.includes('warning') || textLower.includes('danger') || textLower.includes('look') || textLower.includes('stop') || textLower.includes('listen')) {
            selectedPreset = 'neon';
        } else if (textLower.includes('simple') || textLower.includes('clean') || textLower.includes('minimal') || textLower.includes('quiet') || textLower.includes('relax')) {
            selectedPreset = 'minimal';
        } else if (textLower.includes('story') || textLower.includes('cinema') || textLower.includes('film') || textLower.includes('moment') || textLower.includes('remember')) {
            selectedPreset = 'cinematic';
        } else if (textLower.includes('money') || textLower.includes('rich') || textLower.includes('premium') || textLower.includes('luxury') || textLower.includes('brand')) {
            selectedPreset = 'luxury';
        } else if (textLower.includes('secret') || textLower.includes('proof') || textLower.includes('truth') || textLower.includes('fact') || textLower.includes('learn')) {
            selectedPreset = 'stamp';
        } else if (textLower.includes('wow') || textLower.includes('haha') || textLower.includes('amazing')) {
            selectedPreset = 'comic';
        } else {
            // Cycle variety between remaining templates
            selectedPreset = presetKeys[idx % presetKeys.length];
        }
        
        seg.style = Object.assign({}, stylingPresets[selectedPreset], {
            position: 'auto',
            orientation: 'horizontal',
            wordPop: true,
            smartEmojis: true
        });
        
        // Add random slight tilts to bouncy style
        if (selectedPreset === 'bouncy' || selectedPreset === 'comic') {
            seg.style.tilt = idx % 2 === 0 ? -4 : 4;
        }
    });
}

async function applyAutoCaptionPlacement(subtitlesArray, forceAuto = false) {
    if (!videoPlayer || !Number.isFinite(videoPlayer.duration) || !subtitlesArray.length) {
        return { updated: 0, skipped: 'Load a video and captions before Auto Place.' };
    }
    if (!videoPlayer.videoWidth || !videoPlayer.videoHeight) {
        return { updated: 0, skipped: 'Waiting for video frame data before Auto Place.' };
    }

    let updated = 0;

    const wasPaused = videoPlayer.paused;
    const originalTime = videoPlayer.currentTime;
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = 96;
    frameCanvas.height = 160;
    const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });
    const zoneCache = new Map();

    if (!wasPaused) videoPlayer.pause();

    try {
        for (const seg of subtitlesArray) {
            if (!seg.style) seg.style = Object.assign({}, captionStyle);
            if (forceAuto) seg.style.position = 'auto';
            if (seg.style.position !== 'auto') continue;

            const midpoint = Math.max(0, Math.min(videoPlayer.duration - 0.05, seg.start + ((seg.end - seg.start) / 2)));
            const cacheKey = Math.round(midpoint * 2) / 2;
            let placement = zoneCache.get(cacheKey);

            if (!placement) {
                placement = await detectFreeCaptionZone(cacheKey, ctx, frameCanvas);
                zoneCache.set(cacheKey, placement);
            }

            seg.style.autoPlacement = true;
            seg.style.position = 'auto';
            seg.style.resolvedPosition = placement.position;
            seg.style.resolvedOrientation = placement.orientation || 'horizontal';
            seg.style.resolvedCustomLeft = placement.customLeft || null;
            seg.style.resolvedCustomTop = placement.customTop || null;
            seg.style.orientation = placement.orientation || 'horizontal';
            updated++;
        }
        return { updated };
    } catch (err) {
        console.warn('Auto placement skipped:', err);
        return { updated: 0, error: err };
    } finally {
        await seekVideoSilently(originalTime);
        if (!wasPaused) {
            videoPlayer.play().catch(() => {});
        }
    }
}

async function detectFreeCaptionZone(time, ctx, canvas) {
    await seekVideoSilently(time);
    ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
    return detectFreeCaptionZoneFromFrame(ctx, canvas);
}

function getCaptionZoneCandidates() {
    return [
        { name: 'top', position: 'top', orientation: 'horizontal', x1: 0.12, x2: 0.88, y1: 0.10, y2: 0.30, bias: 0.04 },
        { name: 'center', position: 'center', orientation: 'horizontal', x1: 0.16, x2: 0.84, y1: 0.40, y2: 0.60, bias: 0.14 },
        { name: 'bottom', position: 'bottom', orientation: 'horizontal', x1: 0.12, x2: 0.88, y1: 0.68, y2: 0.88, bias: 0 },
        { name: 'left-stack', position: 'custom', orientation: 'vertical-left', customLeft: '16%', customTop: '50%', x1: 0.04, x2: 0.31, y1: 0.18, y2: 0.82, bias: 0.22 },
        { name: 'right-stack', position: 'custom', orientation: 'vertical-right', customLeft: '84%', customTop: '50%', x1: 0.69, x2: 0.96, y1: 0.18, y2: 0.82, bias: 0.22 }
    ];
}

function detectFreeCaptionZoneFromFrame(ctx, canvas) {
    const candidates = getCaptionZoneCandidates();

    const scored = candidates.map(zone => ({
        zone,
        score: scoreFrameZone(ctx, canvas, zone) + zone.bias
    }));

    scored.sort((a, b) => a.score - b.score);
    const bestHorizontal = scored.find(item => item.zone.orientation === 'horizontal');
    const bestOverall = scored[0];
    const winner = bestOverall.zone.orientation !== 'horizontal' &&
        bestHorizontal &&
        bestOverall.score > bestHorizontal.score * 0.72
        ? bestHorizontal.zone
        : bestOverall.zone;
    return {
        position: winner.position,
        orientation: winner.orientation,
        customLeft: winner.customLeft || null,
        customTop: winner.customTop || null
    };
}

function updateLiveAutoPlacement(activeSeg, styleSource) {
    if (!activeSeg || !styleSource || !(styleSource.autoPlacement || styleSource.position === 'auto')) return false;
    if (!videoPlayer || !videoPlayer.videoWidth || !videoPlayer.videoHeight) return false;

    const now = performance.now();
    if (now - lastLivePlacementAt < 650) return false;
    lastLivePlacementAt = now;

    if (!livePlacementCanvas) {
        livePlacementCanvas = document.createElement('canvas');
        livePlacementCanvas.width = 96;
        livePlacementCanvas.height = 160;
        livePlacementCtx = livePlacementCanvas.getContext('2d', { willReadFrequently: true });
    }

    try {
        livePlacementCtx.drawImage(videoPlayer, 0, 0, livePlacementCanvas.width, livePlacementCanvas.height);
        const placement = detectFreeCaptionZoneFromFrame(livePlacementCtx, livePlacementCanvas);
        const changed =
            styleSource.resolvedPosition !== placement.position ||
            styleSource.resolvedOrientation !== placement.orientation ||
            styleSource.resolvedCustomLeft !== (placement.customLeft || null) ||
            styleSource.resolvedCustomTop !== (placement.customTop || null);

        if (changed) {
            styleSource.autoPlacement = true;
            styleSource.resolvedPosition = placement.position;
            styleSource.resolvedOrientation = placement.orientation || 'horizontal';
            styleSource.resolvedCustomLeft = placement.customLeft || null;
            styleSource.resolvedCustomTop = placement.customTop || null;
            styleSource.orientation = placement.orientation || 'horizontal';
        }

        return changed;
    } catch (err) {
        console.warn('Live auto placement skipped:', err);
        return false;
    }
}

function scoreFrameZone(ctx, canvas, zone) {
    const xStart = Math.round(canvas.width * (zone.x1 ?? 0.12));
    const xEnd = Math.round(canvas.width * (zone.x2 ?? 0.88));
    const yStart = Math.round(canvas.height * zone.y1);
    const yEnd = Math.round(canvas.height * zone.y2);
    const width = xEnd - xStart;
    const height = yEnd - yStart;
    const data = ctx.getImageData(xStart, yStart, width, height).data;

    let total = 0;
    let totalSq = 0;
    let edgeTotal = 0;
    let sampleCount = 0;
    let prevLum = null;

    for (let i = 0; i < data.length; i += 4) {
        const lum = (data[i] * 0.2126) + (data[i + 1] * 0.7152) + (data[i + 2] * 0.0722);
        total += lum;
        totalSq += lum * lum;
        if (prevLum !== null) {
            edgeTotal += Math.abs(lum - prevLum);
        }
        prevLum = lum;
        sampleCount++;
    }

    const mean = total / Math.max(sampleCount, 1);
    const variance = (totalSq / Math.max(sampleCount, 1)) - (mean * mean);
    const edge = edgeTotal / Math.max(sampleCount - 1, 1);
    const brightnessPenalty = Math.abs(mean - 96) / 255;

    return (variance / 9000) + (edge / 80) + brightnessPenalty;
}

function seekVideoSilently(time) {
    return new Promise((resolve) => {
        const target = Math.max(0, Math.min(time, Math.max(videoPlayer.duration - 0.05, 0)));
        if (Math.abs(videoPlayer.currentTime - target) < 0.04) {
            resolve();
            return;
        }

        const done = () => {
            videoPlayer.removeEventListener('seeked', done);
            resolve();
        };

        videoPlayer.addEventListener('seeked', done, { once: true });
        videoPlayer.currentTime = target;
        setTimeout(done, 1200);
    });
}

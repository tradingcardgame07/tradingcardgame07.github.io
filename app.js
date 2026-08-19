// =====================================================================
// DATA
// =====================================================================

// Order + slots for the "View All" gallery (3 rows x 5 cols)
const VIEW_ALL_ORDER = [
  'basic1.png', 'stage1-1.png', 'stage2-1.png', 'basic2.png', 'stage1-2.png',
  'stage2-2.png', 'legend1.png', 'legend2.png', 'special1.png', 'special2.png',
  'special3.png', 'special4.png', 'special5.png', 'special6.png', 'special7.png'
];

// Cards that should always render with the holo/legendary shine effect
const LEGENDARY_CARDS = ['legend1.png', 'legend2.png'];

// Pack definitions
const PACKS = {
  1: { cover: 'Cover3.png', cards: ['basic1.png', 'stage1-2.png', 'special3.png', 'special6.png', 'legend1.png'] },
  2: { cover: 'Cover1.png', cards: ['basic2.png', 'stage2-1.png', 'special7.png', 'special1.png', 'special4.png'] },
  3: { cover: 'Cover2.png', cards: ['stage2-2.png', 'stage1-1.png', 'special2.png', 'special5.png', 'legend2.png'] }
};

const PACK_IDS = [1, 2, 3];

// =====================================================================
// OPENED-CARD TRACKING (in-memory only — resets on page refresh)
// =====================================================================

const openedCards = new Set();

function getOpenedCards() {
  return openedCards;
}

function markCardOpened(fileName) {
  openedCards.add(fileName);
}

// =====================================================================
// NAVIGATION
// =====================================================================

// Screens across which these two tracks should keep playing without
// restarting when the user moves between the paired screens.
const CHOOSE_PACK_SCREENS = ['screen-select', 'screen-packdetail'];
const CARD_REVEAL_SCREENS = ['screen-reveal', 'screen-results'];

function getActiveScreenId() {
  const el = document.querySelector('.screen.active');
  return el ? el.id : null;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);

const viewallAudio = document.getElementById('viewall-audio');
if (viewallAudio) {
  if (id === 'screen-viewall') {
    viewallAudio.currentTime = 0;
    viewallAudio.play().catch(() => {
      // Browser blocked autoplay (rare, since this runs from a click handler) - ignore.
    });
  } else {
    viewallAudio.pause();
  }
}
const homeAudio = document.getElementById('home-audio');
if (homeAudio) {
  if (id === 'screen-home') {
    homeAudio.currentTime = 0;
    homeAudio.play().then(() => {
      console.log('[audio] home-audio started via showScreen navigation.');
    }).catch((err) => {
      console.error('[audio] home-audio failed via showScreen navigation:', err.name, err.message);
    });
  } else {
    homeAudio.pause();
  }
}

// ChoosePack.mp3: plays across Select Pack + Pack Detail, without
// restarting when moving between just those two screens.
const choosepackAudio = document.getElementById('choosepack-audio');
if (choosepackAudio) {
  if (CHOOSE_PACK_SCREENS.includes(id)) {
    if (choosepackAudio.paused) {
      choosepackAudio.play().catch((err) => {
        console.error('[audio] choosepack-audio failed to play:', err.name, err.message);
      });
    }
  } else {
    choosepackAudio.pause();
    choosepackAudio.currentTime = 0;
  }
}

// CardReveal.mp3: plays across Card Reveal + Results, without restarting
// when moving between just those two screens. The legendary-pull
// interruption is handled separately in flipCurrentCard().
const cardRevealAudio = document.getElementById('cardreveal-audio');
if (cardRevealAudio) {
  if (CARD_REVEAL_SCREENS.includes(id)) {
    if (cardRevealAudio.paused) {
      cardRevealAudio.play().catch((err) => {
        console.error('[audio] cardreveal-audio failed to play:', err.name, err.message);
      });
    }
  } else {
    cardRevealAudio.pause();
    cardRevealAudio.currentTime = 0;
  }
}
}


// =====================================================================
// VIEW ALL SCREEN
// =====================================================================

function renderViewAll() {
  const opened = getOpenedCards();
  const grid = document.getElementById('viewall-grid');
  grid.innerHTML = '';

  VIEW_ALL_ORDER.forEach(fileName => {
    const slot = document.createElement('div');

    if (opened.has(fileName)) {
      slot.className = 'card-slot' + (LEGENDARY_CARDS.includes(fileName) ? ' holo-shine legendary' : '');
      const img = document.createElement('img');
      img.src = fileName;
      img.alt = fileName;
      slot.appendChild(img);
    } else {
      slot.className = 'card-slot empty';
    }

    grid.appendChild(slot);
  });
}

// =====================================================================
// SELECT PACK SCREEN (CAROUSEL)
// =====================================================================

let carouselCenterIndex = 0; // index into PACK_IDS currently centered

function renderCarousel() {
  const track = document.getElementById('carousel-track');
  track.innerHTML = '';

  const n = PACK_IDS.length;
  const centerId = PACK_IDS[carouselCenterIndex];
  const leftId = PACK_IDS[(carouselCenterIndex - 1 + n) % n];
  const rightId = PACK_IDS[(carouselCenterIndex + 1) % n];

  const positions = [
    { id: leftId, cls: 'pos-left' },
    { id: centerId, cls: 'pos-center' },
    { id: rightId, cls: 'pos-right' }
  ];

  positions.forEach(pos => {
    const pack = PACKS[pos.id];
    const card = document.createElement('div');
    card.className = 'pack-card holo-shine ' + pos.cls;
    card.dataset.packId = pos.id;

    const img = document.createElement('img');
    img.src = pack.cover;
    img.alt = 'Pack ' + pos.id;
    card.appendChild(img);

    card.addEventListener('click', () => {
      if (pos.cls === 'pos-center') {
        openPackDetail(pos.id);
      } else if (pos.cls === 'pos-left') {
        rotateCarousel(-1);
      } else {
        rotateCarousel(1);
      }
    });

    track.appendChild(card);
  });
}

function rotateCarousel(direction) {
  const n = PACK_IDS.length;
  carouselCenterIndex = (carouselCenterIndex + direction + n) % n;
  renderCarousel();
}

// Swipe support for carousel
function addSwipeSupport(el, onSwipeLeft, onSwipeRight) {
  let startX = null;

  el.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  el.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const endX = e.changedTouches[0].clientX;
    const delta = endX - startX;
    if (Math.abs(delta) > 40) {
      if (delta < 0) onSwipeLeft();
      else onSwipeRight();
    }
    startX = null;
  });
}

// =====================================================================
// PACK DETAIL SCREEN
// =====================================================================

let selectedPackId = null;

function openPackDetail(packId) {
  selectedPackId = packId;
  const pack = PACKS[packId];
  document.getElementById('detail-cover-img').src = pack.cover;
  showScreen('screen-packdetail');
}

// =====================================================================
// CARD REVEAL SCREEN
// =====================================================================

let revealIndex = 0;
let revealedFlags = [false, false, false, false, false];

function startPackOpening() {
  revealIndex = 0;
  revealedFlags = [false, false, false, false, false];
  document.getElementById('view-results-btn').style.display = 'none';
  showScreen('screen-reveal');
  renderRevealCard();
}

function currentPackCards() {
  return PACKS[selectedPackId].cards;
}

function renderRevealCard() {
  const cards = currentPackCards();
  const fileName = cards[revealIndex];
  const isRevealed = revealedFlags[revealIndex];

  document.getElementById('reveal-counter').textContent = `Card ${revealIndex + 1}/${cards.length}`;

  const flipEl = document.getElementById('card-flip');
  flipEl.classList.toggle('flipped', isRevealed);

  const frontImg = document.getElementById('card-front-img');
  frontImg.src = fileName;

  const frontFace = document.getElementById('card-front');
  frontFace.classList.toggle('holo-shine', LEGENDARY_CARDS.includes(fileName));
  frontFace.classList.toggle('legendary', LEGENDARY_CARDS.includes(fileName));

  document.getElementById('tap-reveal-text').style.visibility = isRevealed ? 'hidden' : 'visible';

  // Arrow availability
  document.getElementById('reveal-arrow-left').style.visibility = revealIndex === 0 ? 'hidden' : 'visible';
  const isLast = revealIndex === cards.length - 1;
  document.getElementById('reveal-arrow-right').style.visibility = isLast ? 'hidden' : 'visible';

  // Show "View Results" only once the final card has been revealed
  const viewResultsBtn = document.getElementById('view-results-btn');
  if (isLast && revealedFlags[revealIndex]) {
    viewResultsBtn.style.display = 'inline-block';
  } else {
    viewResultsBtn.style.display = 'none';
  }
}

function flipCurrentCard() {
  if (revealedFlags[revealIndex]) return; // already revealed, tapping does nothing further
  const fileName = currentPackCards()[revealIndex];
  revealedFlags[revealIndex] = true;
  markCardOpened(fileName);
  renderRevealCard();

  if (LEGENDARY_CARDS.includes(fileName)) {
    playLegendPull();
  }
}

// Interrupts CardReveal.mp3 for a one-shot legendary pull sound, then
// resumes CardReveal.mp3 once it finishes - as long as the user is still
// somewhere in the reveal/results flow by then.
function playLegendPull() {
  const cardRevealAudio = document.getElementById('cardreveal-audio');
  const legendPullAudio = document.getElementById('legendpull-audio');
  if (!legendPullAudio) return;

  if (cardRevealAudio) {
    cardRevealAudio.pause();
  }

  legendPullAudio.currentTime = 0;
  legendPullAudio.play().catch((err) => {
    console.error('[audio] legendpull-audio failed to play:', err.name, err.message);
  });

  const resumeCardReveal = () => {
    legendPullAudio.removeEventListener('ended', resumeCardReveal);
    if (cardRevealAudio && CARD_REVEAL_SCREENS.includes(getActiveScreenId())) {
      cardRevealAudio.play().catch(() => {});
    }
  };
  legendPullAudio.addEventListener('ended', resumeCardReveal);
}

function moveReveal(direction) {
  const cards = currentPackCards();
  const newIndex = revealIndex + direction;
  if (newIndex < 0 || newIndex > cards.length - 1) return;
  revealIndex = newIndex;
  renderRevealCard();
}

// =====================================================================
// RESULTS SCREEN
// =====================================================================

function renderResults() {
  const cards = currentPackCards();
  const grid = document.getElementById('pyramid-grid');
  grid.innerHTML = '';

  const rowSplit = [3, 2]; // pyramid: 3 on top, 2 below
  let cursor = 0;

  rowSplit.forEach(count => {
    const row = document.createElement('div');
    row.className = 'pyramid-row';

    for (let i = 0; i < count && cursor < cards.length; i++, cursor++) {
      const fileName = cards[cursor];
      const cardEl = document.createElement('div');
      cardEl.className = 'pyramid-card' + (LEGENDARY_CARDS.includes(fileName) ? ' holo-shine legendary' : '');

      const img = document.createElement('img');
      img.src = fileName;
      img.alt = fileName;
      cardEl.appendChild(img);

      row.appendChild(cardEl);
    }

    grid.appendChild(row);
  });

  showScreen('screen-results');
}

// =====================================================================
// EVENT WIRING
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {

  // Home
  const homeAudioOnLoad = document.getElementById('home-audio');
  if (homeAudioOnLoad) {
    console.log('[audio] home-audio element found. src:', homeAudioOnLoad.currentSrc || homeAudioOnLoad.querySelector('source')?.src);
    homeAudioOnLoad.addEventListener('error', () => {
      const err = homeAudioOnLoad.error;
      console.error('[audio] home-audio failed to load. code:', err && err.code, '(1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED/NOT_FOUND)');
    });

    // Browsers block audio with sound from playing before any user
    // interaction, but they DO allow autoplay if it starts muted. So we start
    // it muted right away (so it's already mid-track, in sync) and just flip
    // muted off on the very first tap - no restart, minimal perceived delay.
    homeAudioOnLoad.muted = true;
    homeAudioOnLoad.play().then(() => {
      console.log('[audio] home-audio autoplaying muted on page load.');
    }).catch((err) => {
      console.warn('[audio] even muted autoplay was blocked:', err.name, err.message);
    });

    const unmuteOnFirstInteraction = () => {
      homeAudioOnLoad.muted = false;
      if (homeAudioOnLoad.paused && document.getElementById('screen-home').classList.contains('active')) {
        homeAudioOnLoad.play().catch(() => {});
      }
      console.log('[audio] home-audio unmuted after first interaction.');
      document.removeEventListener('click', unmuteOnFirstInteraction, true);
      document.removeEventListener('touchstart', unmuteOnFirstInteraction, true);
    };
    document.addEventListener('click', unmuteOnFirstInteraction, true);
    document.addEventListener('touchstart', unmuteOnFirstInteraction, true);
  } else {
    console.error('[audio] no element with id="home-audio" found in the DOM.');
  }
  
  document.getElementById('btn-select-pack').addEventListener('click', () => {
    carouselCenterIndex = 0;
    renderCarousel();
    showScreen('screen-select');
  });

  document.getElementById('btn-view-all').addEventListener('click', () => {
    renderViewAll();
    showScreen('screen-viewall');
  });

  // Generic back buttons with data-target
  document.querySelectorAll('[data-target]').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.target));
  });

  // Select pack carousel
  document.getElementById('arrow-left').addEventListener('click', () => rotateCarousel(-1));
  document.getElementById('arrow-right').addEventListener('click', () => rotateCarousel(1));
  addSwipeSupport(document.getElementById('carousel'), () => rotateCarousel(1), () => rotateCarousel(-1));

  // Pack detail
  document.getElementById('choose-pack-btn').addEventListener('click', startPackOpening);
  document.getElementById('detail-back').addEventListener('click', () => showScreen('screen-select'));

  // Card reveal
  document.getElementById('card-flip').addEventListener('click', flipCurrentCard);
  document.getElementById('reveal-arrow-left').addEventListener('click', () => moveReveal(-1));
  document.getElementById('reveal-arrow-right').addEventListener('click', () => moveReveal(1));
  document.getElementById('reveal-back').addEventListener('click', () => showScreen('screen-packdetail'));
  document.getElementById('view-results-btn').addEventListener('click', renderResults);
  addSwipeSupport(document.getElementById('card-flip-wrapper'), () => moveReveal(1), () => moveReveal(-1));

  // Results
  document.getElementById('open-another-btn').addEventListener('click', () => {
    carouselCenterIndex = 0;
    renderCarousel();
    showScreen('screen-select');
  });

  document.getElementById('results-view-all-btn').addEventListener('click', () => {
    renderViewAll();
    showScreen('screen-viewall');
  });
});
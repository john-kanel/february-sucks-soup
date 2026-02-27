import './style.css';

const judgeTemplate = `Soup Judge Scorecard
===========================
Name: ______________________
Soup: ______________________
Chef: ______________________

Score out of 5 (use decimals if needed):
Aroma: ____
Texture: ____
Heat Level: ____
Surprise Factor: ____
Overall Cozy Vibes: ____

Notes for the chef:
________________________________________
________________________________________

Remember: hydrate between ladles!`;

let tabs = [];
let yearStages = [];
let homeFlow = null;
const PARTY_DATE = new Date('2026-02-27T19:00:00');
const PARTY_DATE_LABEL = 'February 27, 2026 @ 7:00 PM';
// Feb 27, 2026 @ 7:00 PM CST (UTC-6) => 2026-02-28 01:00:00 UTC
const SHOP_RELEASE_AT_MS = Date.UTC(2026, 1, 28, 1, 0, 0);
const SHOP_PREVIEW_MINUTES = 30;
const SHOP_PREVIEW_UNTIL_KEY = 'fss-shop-preview-until';
const SHOP_PREVIEW_COOKIE_KEY = 'fss_shop_preview_until';

window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  wireTabs();
  wireHomeTriggers();
  wireCtas();
  wireShopButtons();
  updateCountdown();
  showHome();
});

function cacheDom() {
  tabs = Array.from(document.querySelectorAll('[data-tab]'));
  yearStages = Array.from(document.querySelectorAll('.year-stage'));
  homeFlow = document.querySelector('[data-home-view]');

  if (!isShopVisible()) {
    document.querySelector('[data-shop-tab]')?.remove();
    document.querySelector('[data-shop-stage]')?.remove();
    tabs = tabs.filter((tab) => tab.dataset.tab !== 'shop');
    yearStages = yearStages.filter((stage) => stage.dataset.year !== 'shop');
  }
}

function isShopVisible() {
  const nowMs = Date.now();
  if (nowMs >= SHOP_RELEASE_AT_MS) return true;

  const previewUntilMs = getOrCreatePreviewWindowEnd();
  return nowMs <= previewUntilMs;
}

function getOrCreatePreviewWindowEnd() {
  const savedMs = readSavedPreviewUntil();

  if (Number.isFinite(savedMs) && savedMs > 0) {
    return clampPreviewUntil(savedMs);
  }

  const previewUntilMs = clampPreviewUntil(
    Date.now() + SHOP_PREVIEW_MINUTES * 60 * 1000
  );
  savePreviewUntil(previewUntilMs);
  return previewUntilMs;
}

function clampPreviewUntil(valueMs) {
  // Never allow preview to run beyond the official release.
  return Math.min(valueMs, SHOP_RELEASE_AT_MS - 1);
}

function readSavedPreviewUntil() {
  const localValue = readLocalStorage(SHOP_PREVIEW_UNTIL_KEY);
  const localMs = Number(localValue);
  if (Number.isFinite(localMs) && localMs > 0) return localMs;

  const cookieValue = readCookie(SHOP_PREVIEW_COOKIE_KEY);
  const cookieMs = Number(cookieValue);
  if (Number.isFinite(cookieMs) && cookieMs > 0) return cookieMs;

  return NaN;
}

function savePreviewUntil(valueMs) {
  writeLocalStorage(SHOP_PREVIEW_UNTIL_KEY, String(valueMs));
  writeCookie(SHOP_PREVIEW_COOKIE_KEY, String(valueMs), SHOP_RELEASE_AT_MS);
}

function readLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write errors (private mode/restricted storage).
  }
}

function readCookie(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value, expiresAtMs) {
  try {
    const expires = new Date(expiresAtMs).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie write errors.
  }
}

function wireTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const year = tab.dataset.tab;
      showYear(year);
    });
  });
}

function wireHomeTriggers() {
  const triggers = document.querySelectorAll(
    '[data-back-home], [data-home-trigger]'
  );
  triggers.forEach((trigger) => trigger.addEventListener('click', showHome));
}

function showHome() {
  homeFlow?.removeAttribute('hidden');
  yearStages.forEach((stage) => {
    stage.classList.remove('active');
    stage.setAttribute('aria-hidden', 'true');
  });
  tabs.forEach((tab) => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showYear(year) {
  if (!year) return;
  homeFlow?.setAttribute('hidden', 'hidden');
  yearStages.forEach((stage) => {
    const isMatch = stage.dataset.year === year;
    stage.classList.toggle('active', isMatch);
    stage.setAttribute('aria-hidden', String(!isMatch));
  });
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === year;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function wireCtas() {
  const primaryCta = document.querySelector('.primary-cta');
  const ghostCta = document.querySelector('.ghost-cta');
  const tabNav = document.querySelector('.year-tabs');

  primaryCta?.addEventListener('click', () => {
    tabNav?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  ghostCta?.addEventListener('click', () => {
    const blob = new Blob([judgeTemplate], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'soup-scorecard.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 500);
  });
}

function wireShopButtons() {
  const productButtons = document.querySelectorAll('.product-button');
  productButtons.forEach((button) => {
    button.addEventListener('click', () => {
      window.alert('Added to cart (demo). Checkout is coming soon.');
    });
  });
}

function updateCountdown() {
  const daysEl = document.getElementById('countdown-days');
  const hoursEl = document.getElementById('countdown-hours');
  const minutesEl = document.getElementById('countdown-minutes');
  const secondsEl = document.getElementById('countdown-seconds');
  const countdownDate = document.querySelector('.countdown-date');
  const countdownTimer = document.querySelector('.countdown-timer');
  
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  if (countdownDate) {
    countdownDate.textContent = PARTY_DATE_LABEL;
  }

  function tick() {
    const now = new Date();
    const diffMs = PARTY_DATE.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      // Party time! Replace timer with message
      if (countdownTimer) {
        countdownTimer.innerHTML = '<p class="party-time">🎉 Party time! 🎉</p>';
      }
      return;
    }

    // Calculate time units
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    // Update the display (pad with zeros for consistent look)
    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  // Run immediately, then every second
  tick();
  setInterval(tick, 1000);
}


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

window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  wireTabs();
  wireHomeTriggers();
  wireCtas();
  updateCountdown();
  showHome();
});

function cacheDom() {
  tabs = Array.from(document.querySelectorAll('[data-tab]'));
  yearStages = Array.from(document.querySelectorAll('.year-stage'));
  homeFlow = document.querySelector('[data-home-view]');
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


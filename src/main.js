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

window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  removeAnySelectFallbacks();
  wireTabs();
  wireHomeTriggers();
  wireCtas();
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

// Safety: remove any auto-inserted native select dropdown Safari might render
function removeAnySelectFallbacks() {
  const rogueSelects = document.querySelectorAll('.site-header select');
  rogueSelects.forEach((node) => node.remove());
}


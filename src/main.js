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
let yearsToggle = null;
let yearsMenu = null;

window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  wireTabs();
  wireDropdown();
  wireHomeTriggers();
  wireCtas();
  showHome();
});

function cacheDom() {
  tabs = Array.from(document.querySelectorAll('[data-tab]'));
  yearStages = Array.from(document.querySelectorAll('.year-stage'));
  homeFlow = document.querySelector('[data-home-view]');
  yearsToggle = document.querySelector('.years-toggle');
  yearsMenu = document.querySelector('.years-menu');
}

function wireTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const year = tab.dataset.tab;
      showYear(year);
      closeDropdown();
    });
  });
}

function wireDropdown() {
  if (!yearsToggle || !yearsMenu) return;

  yearsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = yearsToggle.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!yearsMenu.contains(e.target) && e.target !== yearsToggle) {
      closeDropdown();
    }
  });
}

function openDropdown() {
  if (!yearsToggle || !yearsMenu) return;
  yearsToggle.setAttribute('aria-expanded', 'true');
  yearsMenu.removeAttribute('hidden');
}

function closeDropdown() {
  if (!yearsToggle || !yearsMenu) return;
  yearsToggle.setAttribute('aria-expanded', 'false');
  yearsMenu.setAttribute('hidden', 'hidden');
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


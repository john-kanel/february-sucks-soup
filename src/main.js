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
// Visible window in CST:
// Start: Feb 27, 2026 @ 7:00 PM CST (UTC-6) => 2026-02-28 01:00:00 UTC
// End:   Feb 28, 2026 @ 1:00 AM CST (UTC-6) => 2026-02-28 07:00:00 UTC
const SHOP_RELEASE_START_MS = Date.UTC(2026, 1, 28, 1, 0, 0);
const SHOP_RELEASE_END_MS = Date.UTC(2026, 1, 28, 7, 0, 0);
const SHOP_PREVIEW_MINUTES = 30;
const SHOP_PREVIEW_UNTIL_KEY = 'fss-shop-preview-until';
const SHOP_PREVIEW_COOKIE_KEY = 'fss_shop_preview_until';
const SHOP_FORCE_HIDDEN = true;
const SHOP_PRODUCTS = {
  'brock-hoodie': { name: 'The Brock Hoodie', price: 25000, requiresSize: true },
  'riley-hoodie': { name: 'The Riley Hoodie', price: 25000, requiresSize: true },
  'seth-tumbler': { name: 'The Seth Tumbler', price: 25000, requiresSize: false },
  'soup-journal': { name: 'The Soup Journal', price: 25000, requiresSize: false },
  'john-onesie': { name: 'The John Onesie', price: 25000, requiresSize: false }
};

let shopView = 'catalog';
let shopCart = [];
let checkoutDetails = null;

window.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  wireTabs();
  wireHomeTriggers();
  wireCtas();
  wireShopFlow();
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
  if (SHOP_FORCE_HIDDEN) return false;

  const nowMs = Date.now();
  if (nowMs >= SHOP_RELEASE_START_MS && nowMs < SHOP_RELEASE_END_MS) {
    return true;
  }

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
  // Never allow preview to run into the scheduled release window.
  return Math.min(valueMs, SHOP_RELEASE_START_MS - 1);
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
  writeCookie(SHOP_PREVIEW_COOKIE_KEY, String(valueMs), SHOP_RELEASE_START_MS);
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
  if (year === 'shop') {
    renderShopUi();
  }
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

function wireShopFlow() {
  const shopStage = document.querySelector('[data-shop-stage]');
  if (!shopStage) return;

  const productButtons = shopStage.querySelectorAll('[data-add-product]');
  productButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.dataset.addProduct;
      const product = SHOP_PRODUCTS[productId];
      if (!product) return;

      let size = '';
      const sizeSelectId = button.dataset.sizeSelect;
      if (sizeSelectId) {
        const sizeSelect = document.getElementById(sizeSelectId);
        size = sizeSelect?.value?.trim() ?? '';
        if (product.requiresSize && !size) {
          window.alert('Please choose a size first.');
          return;
        }
      }

      addToCart(productId, size);
      shopView = 'cart';
      renderShopUi();
    });
  });

  const navButtons = shopStage.querySelectorAll('[data-shop-nav]');
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetView = button.dataset.shopNav;
      if (!targetView) return;
      navigateShop(targetView);
    });
  });

  const checkoutForm = shopStage.querySelector('[data-checkout-form]');
  checkoutForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!shopCart.length) {
      shopView = 'catalog';
      renderShopUi();
      return;
    }

    const formData = new FormData(checkoutForm);
    checkoutDetails = {
      fullName: String(formData.get('fullName') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      state: String(formData.get('state') || '').trim(),
      zip: String(formData.get('zip') || '').trim()
    };

    if (Object.values(checkoutDetails).some((value) => !value)) {
      window.alert('Please fill in all checkout details.');
      return;
    }

    shopView = 'review';
    renderShopUi();
  });

  const paymentForm = shopStage.querySelector('[data-payment-form]');
  paymentForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!shopCart.length) {
      shopView = 'catalog';
      renderShopUi();
      return;
    }

    const formData = new FormData(paymentForm);
    const cardNumber = String(formData.get('cardNumber') || '').trim();
    const expiry = String(formData.get('expiry') || '').trim();
    const cvv = String(formData.get('cvv') || '').trim();

    if (!cardNumber || !expiry || !cvv) {
      window.alert('Please fill in your fake payment details.');
      return;
    }

    const orderNumber = `FSS-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    const orderNumberEl = shopStage.querySelector('[data-order-number]');
    if (orderNumberEl) orderNumberEl.textContent = orderNumber;

    shopCart = [];
    checkoutDetails = null;
    shopView = 'confirmation';
    paymentForm.reset();
    renderShopUi();
  });

  const restartButton = shopStage.querySelector('[data-shop-restart]');
  restartButton?.addEventListener('click', () => {
    shopView = 'catalog';
    renderShopUi();
  });

  const cartList = shopStage.querySelector('[data-cart-list]');
  cartList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;

    const action = button.dataset.cartAction;
    const key = button.dataset.cartKey;
    if (!action || !key) return;

    if (action === 'increase') {
      updateCartItemQuantity(key, 1);
    } else if (action === 'decrease') {
      updateCartItemQuantity(key, -1);
    } else if (action === 'remove') {
      shopCart = shopCart.filter((item) => item.key !== key);
    }

    renderShopUi();
  });

  renderShopUi();
}

function navigateShop(targetView) {
  if (targetView === 'checkout' && !shopCart.length) {
    window.alert('Your cart is empty.');
    shopView = 'catalog';
  } else if (targetView === 'review' && !checkoutDetails) {
    window.alert('Please complete checkout details first.');
    shopView = 'checkout';
  } else {
    shopView = targetView;
  }
  renderShopUi();
}

function addToCart(productId, size = '') {
  const key = `${productId}::${size || 'nosize'}`;
  const existing = shopCart.find((item) => item.key === key);
  if (existing) {
    existing.quantity += 1;
    return;
  }

  const product = SHOP_PRODUCTS[productId];
  if (!product) return;

  shopCart.push({
    key,
    productId,
    size,
    quantity: 1
  });
}

function updateCartItemQuantity(key, delta) {
  shopCart = shopCart
    .map((item) => {
      if (item.key !== key) return item;
      return { ...item, quantity: item.quantity + delta };
    })
    .filter((item) => item.quantity > 0);
}

function getCartCount() {
  return shopCart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartSubtotal() {
  return shopCart.reduce((sum, item) => {
    const product = SHOP_PRODUCTS[item.productId];
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function renderShopUi() {
  const shopStage = document.querySelector('[data-shop-stage]');
  if (!shopStage) return;

  const allViews = shopStage.querySelectorAll('[data-shop-view]');
  allViews.forEach((view) => {
    view.classList.toggle('active', view.dataset.shopView === shopView);
  });

  const countEl = shopStage.querySelector('[data-cart-count]');
  if (countEl) countEl.textContent = String(getCartCount());

  const subtotalEl = shopStage.querySelector('[data-cart-subtotal]');
  if (subtotalEl) subtotalEl.textContent = formatMoney(getCartSubtotal());

  renderCartList(shopStage);
  renderReviewDetails(shopStage);
  renderShopStepper(shopStage);
}

function renderCartList(shopStage) {
  const cartList = shopStage.querySelector('[data-cart-list]');
  if (!cartList) return;

  if (!shopCart.length) {
    cartList.innerHTML = '<p class="shop-empty">Your cart is empty.</p>';
    return;
  }

  cartList.innerHTML = shopCart
    .map((item) => {
      const product = SHOP_PRODUCTS[item.productId];
      if (!product) return '';
      const sizeLabel = item.size ? ` · Size: ${item.size}` : '';
      return `
        <article class="cart-item">
          <div>
            <h4>${product.name}</h4>
            <p>${formatMoney(product.price)}${sizeLabel}</p>
          </div>
          <div class="cart-controls">
            <button type="button" data-cart-action="decrease" data-cart-key="${item.key}">-</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-action="increase" data-cart-key="${item.key}">+</button>
            <button type="button" data-cart-action="remove" data-cart-key="${item.key}">Remove</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderReviewDetails(shopStage) {
  const addressEl = shopStage.querySelector('[data-review-address]');
  const totalEl = shopStage.querySelector('[data-review-total]');

  if (addressEl) {
    if (!checkoutDetails) {
      addressEl.textContent = 'Not entered';
    } else {
      addressEl.textContent =
        `${checkoutDetails.fullName}, ${checkoutDetails.address}, ${checkoutDetails.city}, ${checkoutDetails.state} ${checkoutDetails.zip}`;
    }
  }
  if (totalEl) totalEl.textContent = formatMoney(getCartSubtotal());
}

function renderShopStepper(shopStage) {
  const stepperEl = shopStage.querySelector('[data-shop-stepper]');
  if (!stepperEl) return;

  const stepLabels = {
    catalog: 'Catalog',
    cart: 'Cart',
    checkout: 'Checkout',
    review: 'Review',
    confirmation: 'Done'
  };
  stepperEl.textContent = `Current step: ${stepLabels[shopView] || 'Catalog'}`;
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


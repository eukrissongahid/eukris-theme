import { AppEvent } from './appEvent.js';

class TestProductVariantSelector extends HTMLElement {
  constructor() {
    super();
    this.variantsAtrrib = null;
    this.optionsAtrrib = null;
    this.productHandleAtrrib = null;

    this.onOptionChangeHandler = this.onOptionChange.bind(this);
    this.onAddToCartClick = () => this.handleAction((id, qty) => this.addToCart(id, qty));
    this.onBuyNowClick = () => this.handleAction((id, qty) => this.buyNow(id, qty));

    this.selectChangeListeners = [];

    this.quantityInputEl = null;
    this.priceLabeEl = null;
    this.comparePriceEl = null;
    this.addTocartBtnEl = null;
    this.buyNowBtnEl = null;
    this.availableQntyLabelEl = null;
  }

  connectedCallback() {
    this.variantsAtrrib = this.parseJSONAttribute('variants');
    this.optionsAtrrib = this.parseJSONAttribute('options');
    this.productHandleAtrrib = this.getAttribute('product-handle');
    this.variantIdFromUrl = this.getVariantIdFromUrl();
    this.loadSection();
  }

  disconnectedCallback() {
    this.removeElementsListener();
  }

  parseJSONAttribute(attr) {
    const json = this.getAttribute(attr);
    try {
      return json ? JSON.parse(json) : [];
    } catch {
      console.warn(`[TestProductVariantSelector] Invalid JSON in attribute: ${attr}`);
      return [];
    }
  }

  async loadSection() {
    try {
      this.quantityInputEl = this.querySelector('#product-quantity-input');
      this.priceLabeEl = this.querySelector('#product-price');
      this.comparePriceEl = this.querySelector('#product-compare-price');
      this.addTocartBtnEl = this.querySelector('#product-add-to-cart-btn');
      this.buyNowBtnEl = this.querySelector('#product-buy-now-btn');
      this.availableQntyLabelEl = this.querySelector('#product-available-qty');

      this.renderOptions();
      this.setupButtonsListener();

      if (this.variantIdFromUrl) {
        this.updateAvailabilityById(this.variantIdFromUrl);
      }
    } catch (err) {
      console.error('[TestProductVariantSelector] loadSection error:', err);
    }
  }

  renderOptions() {
    if (!this.variantsAtrrib.length || !this.optionsAtrrib.length) {
      console.warn('[TestProductVariantSelector] No variants or options data provided');
      return;
    }

    const container = this.querySelector('#dropdowns_here');
    if (!container) return;

    container.innerHTML = '';
    this.selectChangeListeners = [];

    this.optionsAtrrib.forEach((optionName, index) => {
      const values = [...new Set(this.variantsAtrrib.map((v) => v.options[index]))];

      const label = document.createElement('label');
      label.setAttribute('for', `option-select-${index}`);
      label.textContent = optionName;
      label.className = 'block mb-1 font-semibold text-sm text-gray-700';

      const select = document.createElement('select');
      select.id = `option-select-${index}`;
      select.name = `option-${index}`;
      select.className = 'w-full mb-3 border border-gray-300 rounded px-2 py-1 text-sm';

      values.forEach((value) => {
        const optionEl = document.createElement('option');
        optionEl.value = value;
        optionEl.textContent = value;
        if (this.getSelectedVariant()?.options[index] === value) optionEl.selected = true;
        select.appendChild(optionEl);
      });

      select.addEventListener('change', this.onOptionChangeHandler);
      this.selectChangeListeners.push({ select, listener: this.onOptionChangeHandler });

      container.append(label, select);
    });

    this.onOptionChange();
  }

  onOptionChange() {
    const selectedOptions = this.optionsAtrrib.map(
      (_, i) => this.querySelector(`#option-select-${i}`)?.value || null
    );

    const matchedVariant = this.variantsAtrrib.find((v) =>
      v.options.every((opt, i) => opt === selectedOptions[i])
    );

    if (matchedVariant) {
      this.variantIdFromUrl = matchedVariant.id;
      this.updateUrlVariant(matchedVariant.id);
      AppEvent.emit('product:variant:changed', { variantId: matchedVariant.id });
    }

    this.updateAvailability(matchedVariant);
    this.updateQuantityInput(matchedVariant);
    this.updatePriceDisplay(matchedVariant);
  }

  setupButtonsListener() {
    if (this.addTocartBtnEl) {
      this.addTocartBtnEl.addEventListener('click', this.onAddToCartClick);
    }

    if (this.buyNowBtnEl) {
      this.buyNowBtnEl.addEventListener('click', this.onBuyNowClick);
    }
  }

  removeElementsListener() {
    this.selectChangeListeners.forEach(({ select, listener }) => {
      select.removeEventListener('change', listener);
    });

    if (this.addTocartBtnEl) {
      this.addTocartBtnEl.removeEventListener('click', this.onAddToCartClick);
    }
    if (this.buyNowBtnEl) {
      this.buyNowBtnEl.removeEventListener('click', this.onBuyNowClick);
    }
  }

  handleAction(action) {
    const variant = this.getSelectedVariant();
    const quantity = parseInt(this.quantityInputEl?.value || 0, 10);

    if (!variant || !variant.available) {
      showToast({
        type: 'danger',
        message: 'Please select an available variant.',
        duration: 6000
      });
    } else if (variant.compare_at_price === null) {
      showToast({
        type: 'danger',
        message: 'This product cannot be purchased because the price is zero.',
        duration: 6000
      });
    } else if (quantity <= 0 || isNaN(quantity)) {
      showToast({
        type: 'danger',
        message: 'Please enter a valid quantity.',
        duration: 6000
      });
    } else {
      action(variant.id, quantity);
    }
  }

  getSelectedVariant() {
    const variantIdFromUrl = this.getVariantIdFromUrl();
    if (variantIdFromUrl) {
      return this.variantsAtrrib.find((v) => v.id === variantIdFromUrl);
    }

    const selectedOptions = this.optionsAtrrib.map(
      (_, i) => this.querySelector(`#option-select-${i}`)?.value || null
    );
    return this.variantsAtrrib.find((v) => v.options.every((opt, i) => opt === selectedOptions[i]));
  }

  addToCart(variantId, quantity) {
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to add to cart');
        return res.json();
      })
      .then(() => fetch('/cart.js'))
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch cart');
        return res.json();
      })
      .then((cart) => {
        const quantity = this.quantityInputEl ? parseInt(this.quantityInputEl.value, 10) : 0;
        AppEvent.emit('product:cart:changed', { count: cart.item_count });
        const matchedItem = cart.items.find((item) => item.id === variantId);
        AppEvent.emit('product:cart:notification:changed', {
          item: matchedItem,
          addedQty: quantity
        });
      })
      .catch((err) => {
        showToast({
          type: 'danger',
          message: 'Error adding to cart',
          duration: 6000
        });
        console.error(err);
      });
  }

  buyNow(variantId, quantity) {
    const params = new URLSearchParams({
      items: JSON.stringify([{ id: variantId, quantity }])
    });
    window.location.href = `/cart/checkout?${params.toString()}`;
  }

  getVariantIdFromUrl() {
    const id = new URLSearchParams(window.location.search).get('variant');
    return id ? parseInt(id, 10) : null;
  }

  updateAvailabilityById(variantId) {
    const variant = this.variantsAtrrib.find((v) => v.id === variantId);
    this.updateAvailability(variant);
    this.updateQuantityInput(variant);
  }

  updateAvailability(variant) {
    if (!this.availableQntyLabelEl) return;

    if (!variant) {
      this.availableQntyLabelEl.textContent = '(Variant not available)';
    } else if (variant.available) {
      this.availableQntyLabelEl.textContent = '(In stock)';
    } else {
      this.availableQntyLabelEl.textContent = '(Out of stock)';
    }

    this.availableQntyLabelEl.classList.toggle('text-gray-900', variant?.available);
    this.availableQntyLabelEl.classList.toggle('text-gray-500', !variant?.available);
  }

  updateQuantityInput(variant) {
    if (!this.quantityInputEl) return;

    this.quantityInputEl.disabled = !variant?.available;
    if (!variant?.available) this.quantityInputEl.value = 0;
  }

  updatePriceDisplay(variant) {
    if (!this.priceLabeEl || !this.comparePriceEl) return;

    if (variant) {
      const price = formatCurrency(variant.price ?? 0, 'PHP');
      const compareAtPrice = formatCurrency(variant.compare_at_price ?? 0, 'PHP');
      this.priceLabeEl.textContent = price;
      this.comparePriceEl.textContent = compareAtPrice;
    }
  }

  updateUrlVariant(variantId) {
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variantId);
    window.history.replaceState({}, '', url.toString());
  }
}

customElements.define('test-product-variant-selector', TestProductVariantSelector);

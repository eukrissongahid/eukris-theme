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

      this.setupSelectListeners();
      this.setupButtonsListener();

      if (this.variantIdFromUrl) {
        this.setSelectedOptionsByVariantId(this.variantIdFromUrl);
      }
    } catch (err) {
      console.error('[TestProductVariantSelector] loadSection error:', err);
    }
  }

  setupSelectListeners() {
    this.optionsAtrrib.forEach((_, i) => {
      const select = this.querySelector(`#option-select-${i}`);
      if (select) {
        select.addEventListener('change', this.onOptionChangeHandler);
      }
    });
  }

  onOptionChange() {
    const selectedOptions = this.optionsAtrrib.map((_, i) => {
      const select = this.querySelector(`#option-select-${i}`);
      return select?.value !== '' ? select.value : null;
    });

    const matchedVariant = this.populateSelectsAndFindVariant(selectedOptions, {
      setSelected: true,
      disableIfIncomplete: true
    });

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
      .then(() => {
        return fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attributes: {
              _added_variant: variantId,
              _added_quantity: quantity
            }
          })
        });
      })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update cart attributes');
        return res.json();
      })
      .then((cart) => {
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
    const checkoutUrl = `https://${window.location.hostname}/cart/${variantId}:${quantity}`;
    window.location.href = checkoutUrl;
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
    this.availableQntyLabelEl.classList.toggle('text-red-600', !variant?.available);
  }

  updateQuantityInput(variant) {
    if (!this.quantityInputEl) return;

    if (!variant) {
      this.quantityInputEl.disabled = true;
      this.quantityInputEl.value = 0;
    } else {
      this.quantityInputEl.disabled = !variant.available;
      this.quantityInputEl.value = 1;
      this.quantityInputEl.max = variant.available ? 900 : 0;
    }
  }

  updatePriceDisplay(variant) {
    if (!this.priceLabeEl || !this.comparePriceEl) return;

    if (!variant) {
      this.priceLabeEl.textContent = '';
      this.comparePriceEl.textContent = '';
      return;
    }

    this.priceLabeEl.textContent =
      variant.price !== null ? `$${(variant.price / 100).toFixed(2)}` : '';
    this.comparePriceEl.textContent =
      variant.compare_at_price !== null ? `$${(variant.compare_at_price / 100).toFixed(2)}` : '';
  }

  updateUrlVariant(variantId) {
    const url = new URL(window.location);
    url.searchParams.set('variant', variantId);
    window.history.replaceState({}, '', url);
  }

  setSelectedOptionsByVariantId(variantId) {
    const variant = this.variantsAtrrib.find((v) => v.id === variantId);
    if (!variant) return;

    const selectedOptions = variant.options.slice();

    const matchedVariant = this.populateSelectsAndFindVariant(selectedOptions, {
      setSelected: true,
      disableIfIncomplete: false
    });

    if (matchedVariant) {
      this.updateAvailability(matchedVariant);
      this.updateQuantityInput(matchedVariant);
      this.updatePriceDisplay(matchedVariant);

      AppEvent.emit('product:variant:changed', { variantId: matchedVariant.id });
      this.updateUrlVariant(matchedVariant.id);
    }
  }

  populateSelectsAndFindVariant(
    selectedOptions,
    { setSelected = true, disableIfIncomplete = true } = {}
  ) {
    for (let i = 0; i < this.optionsAtrrib.length; i++) {
      const prevSelections = selectedOptions.slice(0, i);
      const select = this.querySelector(`#option-select-${i}`);
      if (!select) continue;

      const matchingVariants = this.variantsAtrrib.filter((v) =>
        prevSelections.every((val, idx) => v.options[idx] === val)
      );

      const values = [...new Set(matchingVariants.map((v) => v.options[i]))];

      select.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '-- Select --';
      placeholder.disabled = true;
      select.appendChild(placeholder);

      values.forEach((value) => {
        const optionEl = document.createElement('option');
        optionEl.value = value;
        optionEl.textContent = value;
        select.appendChild(optionEl);
      });

      if (disableIfIncomplete) {
        const canEnable = prevSelections.every((v) => v !== null);
        select.disabled = !canEnable;
      } else {
        select.disabled = false;
      }

      if (setSelected) {
        const prevValue = selectedOptions[i];
        if (values.includes(prevValue)) {
          select.value = prevValue;
        } else {
          select.value = '';
          selectedOptions[i] = null;
        }
      }
    }

    const isComplete = selectedOptions.every((v) => v !== null);
    const matchedVariant = isComplete
      ? this.variantsAtrrib.find((v) => v.options.every((opt, i) => opt === selectedOptions[i]))
      : null;

    return matchedVariant;
  }
}

window.customElements.define('test-product-variant-selector', TestProductVariantSelector);

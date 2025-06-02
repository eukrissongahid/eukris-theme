/**
 * Custom element to select product variants with options and quantity.
 * @extends HTMLElement
 */
class ProductVariantSelector extends HTMLElement {
  /**
   * Constants for UI texts and CSS class names.
   * @type {Object}
   * @readonly
   */
  static UI_TEXT = {
    LABEL_QUANTITY: 'Quantity:',
    IN_STOCK: '(In stock)',
    OUT_OF_STOCK: '(Out of stock)',
    CURRENCY_SYMBOL: '$'
  };

  /**
   * CSS class names used for UI state changes.
   * @type {Object}
   * @readonly
   */
  static CSS_CLASSES = {
    COMPARE_PRICE_ACTIVE: 'active'
  };

  /**
   * Selectors for elements inside the shadow DOM.
   * @type {Object}
   * @readonly
   */
  static SELECTORS = {
    VARIANT_SELECTORS_CONTAINER: 'variant-selectors',
    PRICE: 'price',
    COMPARE_PRICE: 'comparePrice',
    QUANTITY_INPUT: 'quantityInput',
    AVAILABLE_QTY: 'availableQty'
  };

  /**
   * Default values for quantity and price.
   * @type {Object}
   * @readonly
   */
  static DEFAULTS = {
    INITIAL_QUANTITY: 0,
    MIN_QUANTITY: 0,
    MAX_QUANTITY: Infinity,
    PRICE_DIVIDER: 100
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    /** @type {Array} List of variant objects */
    this.variants = [];
    /** @type {Array} List of option names */
    this.options = [];
    /** @type {Object|null} Currently selected variant */
    this.selectedVariant = null;

    this.renderTemplate(); // Set up the shadow DOM content
  }

  connectedCallback() {
    // Parse attributes and initialize the UI
    if (!this.parseAttributes()) return;

    this.renderSelectors(); // Render dropdowns for options
    this.updateSelectedVariantAndPrice(); // Sync initial selection and price

    // Listen for quantity input changes and emit selection events
    this.getQuantityInput().addEventListener('input', () => {
      this.clampQuantityInput();
      if (this.selectedVariant) {
        const qty = parseInt(this.getQuantityInput().value, 10) || 1;
        this.dispatchSelection(this.selectedVariant.id, qty);
      }
    });
  }

  // Parses variants and options from element attributes
  parseAttributes() {
    try {
      this.variants = JSON.parse(this.getAttribute('variants'));
      this.options = JSON.parse(this.getAttribute('options'));
      return true;
    } catch (e) {
      console.error('Invalid JSON data for variants or options', e);
      return false;
    }
  }

  renderTemplate() {
    const UI_TEXT = this.constructor.UI_TEXT;
    const CSS_CLASSES = this.constructor.CSS_CLASSES;
    const SELECTORS = this.constructor.SELECTORS;
    const DEFAULTS = this.constructor.DEFAULTS;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        label {
          font-weight: 600;
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
        }
        select, input[type="number"] {
          width: 100%;
          padding: 6px 8px;
          font-size: 14px;
          margin-bottom: 12px;
          border: 1px solid #ccc;
          -webkit-border-radius: 4px;
            -moz-border-radius: 4px;
                  border-radius: 4px;
          -webkit-box-sizing: border-box;
            -moz-box-sizing: border-box;
                  box-sizing: border-box;
        }
        .price {
          font-weight: bold;
          font-size: 20px;
          color: #222;
          margin-top: 8px;
        }
        .compare-price {
          font-size: 16px;
          text-decoration: line-through;
          color: gray;
          margin-top: 4px;
          display: none;
        }
        .compare-price.${CSS_CLASSES.COMPARE_PRICE_ACTIVE} {
          display: block;
        }
        .quantity-container {
          margin-top: 0;
          font-size: 14px;
          color: #333;
        }
        .available-qty {
          font-weight: normal;
          font-size: 12px;
          color: #666;
          margin-top: -10px;
          margin-bottom: 12px;
          display: block;
        }
      </style>

      <div id="${SELECTORS.VARIANT_SELECTORS_CONTAINER}"></div>
      <div>
        <p class="compare-price" id="${SELECTORS.COMPARE_PRICE}"></p>
        <p class="price" id="${SELECTORS.PRICE}"></p>
      </div>
      <div class="quantity-container">
        <label for="${SELECTORS.QUANTITY_INPUT}">${UI_TEXT.LABEL_QUANTITY}</label>
        <input type="number" id="${SELECTORS.QUANTITY_INPUT}" min="${DEFAULTS.MIN_QUANTITY}" value="${DEFAULTS.INITIAL_QUANTITY}" />
        <span class="available-qty" id="${SELECTORS.AVAILABLE_QTY}"></span>
      </div>
    `;
  }

  // Helper method to get variant ID from URL
  getVariantIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('variant');
  }

  // Builds the option dropdowns dynamically based on available variants
  renderSelectors() {
    const container = this.getVariantSelectorsContainer();
    container.innerHTML = '';

    // Get variant ID from URL and find corresponding variant object
    const variantIdFromUrl = this.getVariantIdFromUrl();
    const initialVariant =
      this.variants.find((v) => v.id.toString() === variantIdFromUrl) || this.variants[0];

    this.options.forEach((optionName, idx) => {
      const wrapperDiv = document.createElement('div');
      const label = document.createElement('label');
      label.textContent = optionName;
      label.htmlFor = `option-select-${idx}`;

      const select = document.createElement('select');
      select.id = `option-select-${idx}`;
      select.dataset.optionIndex = idx.toString();

      // Extract unique option values for each option group (e.g., ["Red", "Blue"])
      const uniqueValues = [...new Set(this.variants.map((v) => v.options[idx]))];
      uniqueValues.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;

        // Preselect the option that matches the initialVariant
        if (initialVariant && initialVariant.options[idx] === value) {
          option.selected = true;
        }

        select.appendChild(option);
      });

      // Update selection and price when a dropdown value changes
      select.addEventListener('change', () => this.updateSelectedVariantAndPrice());

      wrapperDiv.appendChild(label);
      wrapperDiv.appendChild(select);
      container.appendChild(wrapperDiv);
    });

    // Set selectedVariant and update price right after rendering
    this.updateSelectedVariantAndPrice();
  }

  // Reads selected option values from the dropdowns
  getSelectedOptions() {
    return Array.from(this.shadowRoot.querySelectorAll('select')).map((select) => select.value);
  }

  // Finds the matching variant for currently selected options
  findVariant(selectedOptions) {
    return this.variants.find((variant) =>
      variant.options.every((opt, i) => opt === selectedOptions[i])
    );
  }

  // Updates price and availability display based on selected variant
  updateSelectedVariantAndPrice() {
    const CSS_CLASSES = this.constructor.CSS_CLASSES;
    const DEFAULTS = this.constructor.DEFAULTS;

    const selectedOptions = this.getSelectedOptions();
    const variant = this.findVariant(selectedOptions);
    const priceElem = this.getPriceElement();
    const comparePriceElem = this.getComparePriceElement();
    const quantityInput = this.getQuantityInput();

    if (!variant) {
      // No matching variant; reset display and notify with null
      this.selectedVariant = null;
      this.clearPriceDisplay(priceElem, comparePriceElem);
      this.updateQuantityDisplay(0);
      this.dispatchSelection(null, 0);
      return;
    }
    this.selectedVariant = variant;

    // Show compare-at price if applicable
    priceElem.textContent = this.formatPrice(variant.price);

    // Show compare-at price if applicable
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      comparePriceElem.textContent = this.formatPrice(variant.compare_at_price);
      comparePriceElem.classList.add(CSS_CLASSES.COMPARE_PRICE_ACTIVE);
      priceElem.style.color = 'red';
    } else {
      this.clearComparePrice(comparePriceElem);
      priceElem.style.color = '';
    }

    // Update availability info and reset quantity
    this.updateQuantityDisplay(variant.available ? null : 0);
    quantityInput.value = DEFAULTS.INITIAL_QUANTITY;

    // Notify listeners that a new variant has been selected
    this.dispatchEvent(
      new CustomEvent('variant-changed', {
        detail: { variant: this.selectedVariant },
        bubbles: true,
        composed: true
      })
    );

    // Send initial selection data with quantity
    this.dispatchSelection(variant.id, parseInt(quantityInput.value, 10));
  }

  // Updates UI to reflect whether the product is in stock
  updateQuantityDisplay(availableQty) {
    const UI_TEXT = this.constructor.UI_TEXT;
    const DEFAULTS = this.constructor.DEFAULTS;

    const quantityInput = this.getQuantityInput();
    const availableQtySpan = this.getAvailableQtySpan();

    if (availableQty > 0 || availableQty === null) {
      availableQtySpan.textContent = UI_TEXT.IN_STOCK;
      quantityInput.disabled = false;
      quantityInput.removeAttribute('max');
    } else {
      availableQtySpan.textContent = UI_TEXT.OUT_OF_STOCK;
      quantityInput.disabled = true;
      quantityInput.value = DEFAULTS.INITIAL_QUANTITY;
      quantityInput.setAttribute('max', '0');
    }
  }

  // Ensures quantity input remains within valid bounds
  clampQuantityInput() {
    const DEFAULTS = this.constructor.DEFAULTS;
    const quantityInput = this.getQuantityInput();
    const max = parseInt(quantityInput.getAttribute('max'), 10) || DEFAULTS.MAX_QUANTITY;
    let val = parseInt(quantityInput.value, 10);
    if (isNaN(val) || val < DEFAULTS.MIN_QUANTITY) val = DEFAULTS.MIN_QUANTITY;
    if (val > max) val = max;
    quantityInput.value = val;
  }

  // Dispatches a custom event with the selected variant ID and quantity
  dispatchSelection(variantId, quantity) {
    this.dispatchEvent(
      new CustomEvent('variant-change', {
        detail: { variantId, quantity },
        bubbles: true,
        composed: true
      })
    );
  }

  // Converts price from cents to formatted string (e.g., "$12.99")
  formatPrice(priceInCents) {
    const UI_TEXT = this.constructor.UI_TEXT;
    const DEFAULTS = this.constructor.DEFAULTS;

    return `${UI_TEXT.CURRENCY_SYMBOL}${(priceInCents / DEFAULTS.PRICE_DIVIDER).toFixed(2)}`;
  }

  // Clears both current and compare-at price displays
  clearPriceDisplay(priceElem, comparePriceElem) {
    priceElem.textContent = '';
    this.clearComparePrice(comparePriceElem);
  }

  // Hides and resets compare-at price display
  clearComparePrice(comparePriceElem) {
    const CSS_CLASSES = this.constructor.CSS_CLASSES;

    comparePriceElem.textContent = '';
    comparePriceElem.classList.remove(CSS_CLASSES.COMPARE_PRICE_ACTIVE);
  }

  // Utility methods to access elements from shadow DOM
  getVariantSelectorsContainer() {
    const SELECTORS = this.constructor.SELECTORS;
    return this.shadowRoot.getElementById(SELECTORS.VARIANT_SELECTORS_CONTAINER);
  }

  getPriceElement() {
    const SELECTORS = this.constructor.SELECTORS;
    return this.shadowRoot.getElementById(SELECTORS.PRICE);
  }

  getComparePriceElement() {
    const SELECTORS = this.constructor.SELECTORS;
    return this.shadowRoot.getElementById(SELECTORS.COMPARE_PRICE);
  }

  getQuantityInput() {
    const SELECTORS = this.constructor.SELECTORS;
    return /** @type {HTMLInputElement} */ (
      this.shadowRoot.getElementById(SELECTORS.QUANTITY_INPUT)
    );
  }

  getAvailableQtySpan() {
    const SELECTORS = this.constructor.SELECTORS;
    return this.shadowRoot.getElementById(SELECTORS.AVAILABLE_QTY);
  }
}

// Define the custom element so it can be used in HTML as <product-variant-selector>
customElements.define('product-variant-selector', ProductVariantSelector);

import { AppEvent } from './appEvent.js';

class TestCart extends HTMLElement {
  constructor() {
    super();
    this.cart = null;
    this.updatedQuantities = {};

    this.onUpdateButtonClick = this.onUpdateButtonClick.bind(this);
    this.onQuantityChange = this.onQuantityChange.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);

    this.updateBtnEl = null;
    this.cartItemscontainerEl = null;
    this.subtotalPriceLabelEl = null;
    this.taxPriceLabelEl = null;
    this.totalPriceLabelEl = null;
    this.cartContentlabelEl = null;
    this.emptyCartMsgEl = null;
  }

  connectedCallback() {
    this.loadSection();
  }

  disconnectedCallback() {
    this.removeListenersFromCartItems();
    this.removeUpdateButtonListener();
  }

  async loadSection() {
    try {
      const res = await fetch('/?section_id=cart');
      if (!res.ok) throw new Error('Failed to fetch cart section');

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const fragment = document.createDocumentFragment();
      doc.body.childNodes.forEach((node) => fragment.appendChild(node));

      this.replaceChildren(fragment);

      this.updateBtnEl = this.querySelector('#update-cart-button');
      this.cartItemscontainerEl = this.querySelector('#cart-items');
      this.subtotalPriceLabelEl = this.querySelector('#subtotal-price');
      this.taxPriceLabelEl = this.querySelector('#tax-price');
      this.totalPriceLabelEl = this.querySelector('#total-price');
      this.cartContentlabelEl = this.querySelector('#cart-content');
      this.emptyCartMsgEl = this.querySelector('#empty-cart-message');

      this.attachUpdateButtonListener();

      await this.fetchCartAndRender();
    } catch (err) {
      console.error('[TestCart] loadSection error:', err);
      throw err;
    }
  }

  attachUpdateButtonListener() {
    if (this.updateBtnEl) {
      this.updateBtnEl.addEventListener('click', this.onUpdateButtonClick);
      this._updateBtn = this.updateBtnEl;
    }
  }

  removeUpdateButtonListener() {
    if (this._updateBtn) {
      this._updateBtn.removeEventListener('click', this.onUpdateButtonClick);
      this._updateBtn = null;
    }
  }

  async fetchCartAndRender() {
    try {
      const res = await fetch('/cart.js');
      if (!res.ok) throw new Error('Failed to fetch cart data');
      const cart = await res.json();

      this.updateVisibility(cart);

      const formattedCart = {
        items: cart.items.map((item) => ({
          title: item.product_title,
          variant: item.variant_title || 'Default',
          quantity: item.quantity,
          price: formatCurrency(item.price, 'PHP'),
          total: formatCurrency(item.line_price, 'PHP'),
          image: item.image,
          url: item.url || `/products/${item.handle}`
        }))
      };

      this.cart = formattedCart;
      this.updatedQuantities = {};

      this.removeListenersFromCartItems();

      this.renderCartItems(this.cart);
      this.attachListenersToCartItems();
      this.updateCartTotals(cart);
    } catch (err) {
      console.error('[TestComponentCart] fetchCartAndRender error:', err);
    }
  }

  renderCartItems(cart) {
    if (!this.cartItemscontainerEl) {
      console.warn('[TestComponentCart] No #cart-items container found');
      return;
    }
    this.cartItemscontainerEl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    cart.items.forEach((item, index) => {
      const wrapper = document.createElement('div');
      wrapper.className =
        'cart-item flex flex-col gap-4 border-b border-orange-400 px-2 py-4 md:flex-row md:items-center';

      const imageHtml = item.image
        ? `<img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async" class="h-20 w-20 rounded object-cover shadow-sm">`
        : `<div class="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">No Image</div>`;

      wrapper.innerHTML = `
        <div class="item-info flex flex-1 items-start gap-4 px-2">
          <a href="${item.url}">
            ${imageHtml}
          </a>
          <div class="item-details flex flex-col">
            <a href="${item.url}" class="text-base font-medium text-inherit no-underline">${item.title}</a>
            <span class="text-sm text-gray-500">Variant: ${item.variant}</span>
            <span class="text-sm text-gray-500">${item.price} each</span>
          </div>
        </div>
        <div class="quantity flex w-full justify-center px-2 md:w-28">
          <input type="number" value="${item.quantity}" min="1" data-index="${index}" class="qty-input w-full rounded border border-gray-300 p-2 outline-none">
        </div>
        <div class="total flex w-full justify-start px-2 md:w-20">
          <span>${item.total}</span>
        </div>
        <div class="remove flex w-12 justify-start px-2">
          <a href="#" class="remove-btn cursor-pointer text-xl font-bold text-red-500 no-underline hover:text-red-700" data-index="${index}" title="Remove item">&times;</a>
        </div>
      `;

      fragment.appendChild(wrapper);
    });

    this.cartItemscontainerEl.appendChild(fragment);
  }

  attachListenersToCartItems() {
    this.querySelectorAll('.qty-input').forEach((input) => {
      input.addEventListener('change', this.onQuantityChange);
    });

    this.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.addEventListener('click', this.onRemoveItem);
    });
  }

  removeListenersFromCartItems() {
    this.querySelectorAll('.qty-input').forEach((input) => {
      input.removeEventListener('change', this.onQuantityChange);
    });

    this.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.removeEventListener('click', this.onRemoveItem);
    });
  }

  onQuantityChange(event) {
    const input = event.target;
    const index = input.dataset.index;
    let newQty = parseInt(input.value, 10);
    if (newQty < 1 || isNaN(newQty)) newQty = 1;
    input.value = newQty;

    this.updatedQuantities[index] = newQty;
  }

  onRemoveItem(event) {
    event.preventDefault();
    const index = event.target.dataset.index;
    this.removeCartItem(index, 0);
  }

  async removeCartItem(index, quantity) {
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line: Number(index) + 1,
          quantity: quantity
        })
      });

      if (!res.ok) {
        throw new Error('Failed to remove cart item');
      } else {
        const cart = await res.json();
        AppEvent.emit('product:cart:changed', { count: cart.item_count });
      }

      await this.fetchCartAndRender();
    } catch (err) {
      console.error('[TestComponentCart] removeCartItem error:', err);
    }
  }

  async onUpdateButtonClick() {
    const updates = this.updatedQuantities;
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    const changes = Object.entries(updates).map(([index, qty]) => ({
      line: Number(index) + 1,
      quantity: qty
    }));

    try {
      for (const change of changes) {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change)
        });

        if (!res.ok) {
          throw new Error(`Failed to update cart item at line ${change.line}`);
        } else {
          const cart = await res.json();
          AppEvent.emit('product:cart:changed', { count: cart.item_count });
        }
      }

      await this.fetchCartAndRender();

      this.updatedQuantities = {};
    } catch (err) {
      console.error('[TestComponentCart] batch updateCartItems error:', err);
    }
  }

  updateCartTotals(cartData) {
    if (this.subtotalPriceLabelEl) {
      this.subtotalPriceLabelEl.textContent = `Subtotal: ${formatCurrency(cartData.items_subtotal_price, cartData.currency)}`;
    }

    if (cartData.tax_lines && cartData.tax_lines.length > 0) {
      if (this.taxPriceLabelEl) {
        this.taxPriceLabelEl.textContent = `Tax: ${formatCurrency(cartData.total_tax, cartData.currency)}`;
      }
      if (this.totalPriceLabelEl) {
        this.totalPriceLabelEl.textContent = `Total: ${formatCurrency(cartData.total_price, cartData.currency)}`;
      }
    } else {
      if (this.taxPriceLabelEl) {
        this.taxPriceLabelEl.textContent = 'Taxes and shipping calculated at checkout.';
      }
      if (this.totalPriceLabelEl) {
        this.totalPriceLabelEl.textContent = '';
      }
    }
  }

  updateVisibility(cartData) {
    if (!this.cartContentlabelEl || !this.emptyCartMsgEl) return;

    if (cartData.item_count > 0) {
      this.cartContentlabelEl.style.display = 'block';
      this.emptyCartMsgEl.style.display = 'none';
    } else {
      this.cartContentlabelEl.style.display = 'none';
      this.emptyCartMsgEl.style.display = 'flex';
    }
  }
}

customElements.define('test-component-cart', TestCart);

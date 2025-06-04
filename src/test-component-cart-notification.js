import { AppEvent } from './appEvent.js';

class TestCartNotification extends HTMLElement {
  constructor() {
    super();
    this.onTestCartNotificationChange = this.updateInformation.bind(this);
    this.onDocumentClick = this.handleDocumentClick.bind(this);

    this.notificationContainerEl = null;
    this.itemNameEl = null;
    this.itemImgEl = null;
    this.itemVariantEl = null;
    this.itemAddedQtyEl = null;
    this.itemUnitPriceEl = null;
    this.itemCartQtyEl = null;
    this.itemCartTotalPriceEl = null;
  }

  connectedCallback() {
    this.loadSection();
    AppEvent.on('product:cart:notification:changed', this.onTestCartNotificationChange);
    document.addEventListener('click', this.onDocumentClick);
  }

  disconnectedCallback() {
    AppEvent.off('product:cart:notification:changed', this.onTestCartNotificationChange);
    document.removeEventListener('click', this.onDocumentClick);
  }

  handleDocumentClick(event) {
    if (event.target.matches('.close-btn')) {
      this.hideNotification();
    }

    if (event.target.matches('.cart') || event.target.matches('.checkout')) {
      this.hideNotification();
    }
  }

  hideNotification() {
    if (this.notificationContainerEl) {
      this.notificationContainerEl.classList.add('hidden');
    }
  }

  showNotification() {
    if (this.notificationContainerEl) {
      this.notificationContainerEl.classList.remove('hidden');
    }
  }

  async loadSection() {
    try {
      const res = await fetch('/?section_id=cart-notification');
      if (!res.ok) throw new Error('Failed to fetch cart-notification section');

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const fragment = document.createDocumentFragment();
      doc.body.childNodes.forEach((node) => fragment.appendChild(node));

      this.replaceChildren(fragment);

      this.notificationContainerEl = document.querySelector('#cart-notif');
      this.itemImgEl = this.notificationContainerEl.querySelector('img');
      this.itemNameEl = this.notificationContainerEl.querySelector('#cart-notif-name');
      this.itemVariantEl = this.notificationContainerEl.querySelector('#cart-notif-variant');
      this.itemAddedQtyEl = this.notificationContainerEl.querySelector('#cart-notif-added-qty');
      this.itemUnitPriceEl = this.notificationContainerEl.querySelector('#cart-notif-unit-price');
      this.itemCartQtyEl = this.notificationContainerEl.querySelector('#cart-notif-cart-qty');
      this.itemCartTotalPriceEl =
        this.notificationContainerEl.querySelector('#cart-notif-cart-total');
    } catch (err) {
      console.error('[TestCartNotification] loadSection error:', err);
      throw err;
    }
  }

  async updateInformation(event) {
    const { item, addedQty } = event.detail;
    if (!item) return;

    try {
      await this.loadSection();

      if (!this.notificationContainerEl) return;

      if (this.itemImgEl && item.image) {
        this.itemImgEl.src = item.image;
        this.itemImgEl.alt = item.product_title || 'Product image';
      }

      if (this.itemNameEl) {
        this.itemNameEl.textContent = item.product_title || 'Product Name';
      }

      if (this.itemVariantEl) {
        this.itemVariantEl.textContent = item.variant_title || 'Default variant';
      }

      if (this.itemAddedQtyEl) {
        this.itemAddedQtyEl.textContent = `+${addedQty || 1}`;
      }

      if (this.itemUnitPriceEl) {
        this.itemUnitPriceEl.textContent = formatCurrency(item.price || 0, item.currency || 'PHP');
      }

      if (this.itemCartQtyEl) {
        this.itemCartQtyEl.textContent = item.quantity || 0;
      }

      if (this.itemCartTotalPriceEl) {
        this.itemCartTotalPriceEl.textContent = formatCurrency(
          item.final_line_price || 0,
          item.currency || 'PHP'
        );
      }

      this.showNotification();
    } catch (err) {
      console.error('[TestCartNotification] updateInformation error:', err);
    }
  }
}

customElements.define('test-cart-notification', TestCartNotification);

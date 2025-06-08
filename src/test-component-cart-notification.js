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

    if (event.target.matches('.cart')) {
      this.hideNotification();
    }

    if (event.target.matches('#cart-notif-checkout')) {
      this.checkoutSingleItem();
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

  checkoutSingleItem() {
    const variantId = this.lastAddedVariantId;
    const quantity = this.lastAddedQty || 1;

    if (!variantId) {
      console.warn('[TestCartNotification] No variant ID found for checkout.');
      return;
    }

    const checkoutUrl = `https://${window.location.hostname}/cart/${variantId}:${quantity}`;
    window.location.href = checkoutUrl;
  }

  async updateInformation(event) {
    const { item, addedQty } = event.detail;
    if (!item) return;

    try {
      this.lastAddedVariantId = item.variant_id;
      this.lastAddedQty = addedQty || 1;

      await this.loadSection();
      this.showNotification();
    } catch (err) {
      console.error('[TestCartNotification] updateInformation error:', err);
    }
  }
}

customElements.define('test-cart-notification', TestCartNotification);

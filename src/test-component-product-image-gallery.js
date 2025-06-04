import { AppEvent } from './appEvent.js';

class TestProductImageGallery extends HTMLElement {
  constructor() {
    super();
    this.productHandleAtrrib = null;
    this.variantsAtrrib = null;
    this.staticVariantId = this.getVariantIdFromUrl();
    this.onVariantChange = this.updatePreview.bind(this);

    this.onThumbClickHandler = this.onThumbClick.bind(this);

    this.thumbsEl = null;
    this.mainImageEl = null;
    this.matchingThumbEl = null;
  }

  connectedCallback() {
    AppEvent.on('product:variant:changed', this.onVariantChange);
    this.productHandleAtrrib = this.getAttribute('product-handle');
    this.variantsAtrrib = this.parseJSONAttribute('variants');
    this.loadSection();
  }

  disconnectedCallback() {
    AppEvent.off('product:variant:changed', this.onVariantChange);
    this.cleanupThumbnailClicks();
  }

  parseJSONAttribute(attr) {
    const json = this.getAttribute(attr);
    try {
      return json ? JSON.parse(json) : [];
    } catch {
      console.warn(`[TestProductImageGallery] Invalid JSON in attribute: ${attr}`);
      return [];
    }
  }

  async loadSection() {
    try {
      this.thumbsEl = this.querySelectorAll('.thumb');
      this.mainImageEl = this.querySelector('#mainImage');

      this.setupThumbnailClicks();
      this.setMainImageByVariantId(this.staticVariantId);
    } catch (err) {
      console.error('[TestProductImageGallery] loadSection error:', err);
    }
  }

  setupThumbnailClicks() {
    this.thumbClickListeners = [];

    this.thumbsEl.forEach((thumb) => {
      thumb.addEventListener('click', this.onThumbClickHandler);
      this.thumbClickListeners.push({ thumb, listener: this.onThumbClickHandler });
    });
  }

  cleanupThumbnailClicks() {
    if (!this.thumbClickListeners) return;

    this.thumbClickListeners.forEach(({ thumb, listener }) => {
      thumb.removeEventListener('click', listener);
    });
    this.thumbClickListeners = [];
  }

  onThumbClick(event) {
    const clickedThumb = event.currentTarget;

    this.thumbsEl.forEach((t) => t.classList.remove('active'));
    clickedThumb.classList.add('active');

    const img = clickedThumb.querySelector('img');
    this.mainImageEl.src = img.dataset.large;
    this.mainImageEl.alt = img.alt;
  }

  setMainImageByVariantId(variantId) {
    const variant = this.variantsAtrrib.find((v) => String(v.id) === String(variantId));
    if (!variant) return;

    const targetMediaId = variant.featured_media?.id;
    if (!targetMediaId) return;

    this.matchingThumbEl = this.querySelector(`img[data-media-id="${targetMediaId}"]`);

    if (!this.matchingThumbEl) return;

    this.thumbsEl.forEach((t) => t.classList.remove('active'));
    this.matchingThumbEl.closest('.thumb').classList.add('active');

    if (this.mainImageEl) {
      this.mainImageEl.src = this.matchingThumbEl.dataset.large;
      this.mainImageEl.alt = this.matchingThumbEl.alt;
    }
  }

  updatePreview(event) {
    const variantId = event.detail.variantId;
    this.setMainImageByVariantId(variantId);
  }

  getVariantIdFromUrl() {
    const id = new URLSearchParams(window.location.search).get('variant');
    return id ? parseInt(id, 10) : null;
  }
}

customElements.define('test-product-image-gallery', TestProductImageGallery);

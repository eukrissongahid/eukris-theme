import { AppEvent } from './appEvent.js';

class TestCartIcon extends HTMLElement {
  constructor() {
    super();
    this.onCartChange = this.updateBadge.bind(this);
  }

  connectedCallback() {
    const badge = this.querySelector('#badge');
    if (badge) {
      const count = parseInt(badge.textContent, 10) || 0;
      this.setBadgeCount(count);
    }

    AppEvent.on('product:cart:changed', this.onCartChange);
  }

  disconnectedCallback() {
    AppEvent.off('product:cart:changed', this.onCartChange);
  }

  updateBadge(event) {
    const newCount = event.detail.count;
    this.setBadgeCount(newCount);
  }

  setBadgeCount(count) {
    const badge = this.querySelector('#badge');
    if (!badge) return;

    badge.textContent = count;

    if (count > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

customElements.define('test-component-cart-icon', TestCartIcon);

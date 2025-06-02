class CartIcon extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.update();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .cart-link {
          position: relative;
          display: inline-block;
          color: inherit; /* so stroke uses currentColor */
        }
        .badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 9999px;
          -webkit-border-radius: 9999px;
          -moz-border-radius: 9999px;
          display: none;
          box-sizing: border-box;
          -webkit-box-sizing: border-box;
          -moz-box-sizing: border-box;
        }
        svg.size-6 {
          width: 24px;
          height: 24px;
          -webkit-transform: translateZ(0); /* GPU acceleration hint */
          -ms-transform: translateZ(0);
          transform: translateZ(0);
        }
      </style>
      <a href="/cart" class="cart-link" aria-label="Cart">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="#71797E"
          class="size-6"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5
              m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25
              a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974
              c.576 0 1.059.435 1.119 1.007Z
              M8.625 10.5a.375.375 0 1 1-.75 0
              .375.375 0 0 1 .75 0Z
              m7.5 0a.375.375 0 1 1-.75 0
              .375.375 0 0 1 .75 0Z"
          />
        </svg>
        <span class="badge" id="badge">0</span>
      </a>
    `;
  }

  async update() {
    try {
      const res = await fetch(SHOPIFY_CONSTANTS.ROUTES.CART);
      const cart = await res.json();
      const badge = this.shadowRoot.getElementById('badge');
      if (cart.item_count > 0) {
        badge.textContent = cart.item_count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    } catch (err) {
      console.error('Cart fetch failed:', err);
    }
  }
}

customElements.define('cart-icon', CartIcon);

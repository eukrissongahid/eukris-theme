class CartFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const blocks = JSON.parse(this.getAttribute('blocks') || '[]');
    const subtotal = this.getAttribute('subtotal') || '';
    const taxLinesSize = Number(this.getAttribute('tax-lines-size')) || 0;
    const totalTax = this.getAttribute('total-tax') || '';
    const totalPrice = this.getAttribute('total-price') || '';

    this.shadowRoot.innerHTML = `
    <style>
      .container {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
      }
      @media (min-width: 768px) {
        .container {
          -webkit-box-orient: horizontal;
          -webkit-box-direction: normal;
          -ms-flex-direction: row;
          flex-direction: row;
          -webkit-box-pack: justify;
          -ms-flex-pack: justify;
          justify-content: space-between;
        }
      }
      textarea {
        width: 100%;
        max-width: 600px;
        resize: none;
        -webkit-resize: none;
        border: 1px solid #ccc;
        border-radius: 0.25rem;
        -webkit-border-radius: 0.25rem;
        height: 5rem;
        padding: 0.5rem;
        font-family: inherit;
      }
      button {
        width: 100%;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        -webkit-border-radius: 0.25rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        color: white;
        margin-top: 0.5rem;
      }
      button.update {
        background-color: #f97316; /* orange-500 */
      }
      button.update:hover {
        background-color: #ea580c; /* orange-600 */
      }
      button.checkout {
        background-color: #000;
      }
      button.checkout:hover {
        background-color: #111;
      }
      .subtotal-text {
        font-size: 1.25rem;
        margin-bottom: 0.5rem;
      }
      .tax-text {
        font-size: 0.875rem;
        margin-top: 0.5rem;
      }
      .secure-checkout {
        margin-top: 0.5rem;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #22c55e; /* green-600 */
      }
      svg {
        height: 1rem;
        width: 1rem;
      }
    </style>

    <div class="container">
      <div>
        <label for="cart_notes">Cart notes</label>
        <textarea id="cart_notes" name="note" placeholder="Add special instructions or notes"></textarea>
      </div>
      <div>
        ${blocks
          .map((block) => {
            if (block === 'subtotal') {
              return `
    <p class="text-sm text-gray-600 mb-2">Have a discount code? You can apply it at checkout.</p>
    <h3 class="subtotal-text">Subtotal: ${subtotal}</h3>
    ${
      taxLinesSize > 0
        ? `<p class="tax-text">Tax: ${totalTax}</p>
          <p class="subtotal-text font-semibold">Total: ${totalPrice}</p>`
        : `<p class="tax-text text-gray-500">Taxes and shipping calculated at checkout.</p>`
    }
    `;
            }
            if (block === 'update_button') {
              return `
      <button id="update-cart-button" type="submit" name="update" class="update">Update</button>
    `;
            }
            if (block === 'checkout_button') {
              return `
      <button type="submit" name="checkout" class="checkout">Checkout</button>
      <div class="secure-checkout">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 11c0-1.104.896-2 2-2s2 .896 2 2v1h-4v-1z" />
          <path d="M5 13h14v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6z" />
        </svg>
        <span>Secure checkout</span>
      </div>
    `;
            }
            return '';
          })
          .join('')}
      </div>
    </div>
  `;
  }
}

customElements.define('cart-footer', CartFooter);

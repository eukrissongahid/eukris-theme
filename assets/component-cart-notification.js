class CartNotification extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.querySelector('.close-btn').addEventListener('click', () => this.hide());
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
            position: fixed;
            top: 1.5rem;
            left: 1.5rem;
            z-index: 9999;
            max-width: 350px;
            width: 90%;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            border-radius: 0.5rem;
            overflow: hidden;
            font-family: sans-serif;
            background: #fff;
            border: 1px solid #e5e7eb;
            display: none;
            animation: slideIn 0.3s ease forwards;
            }

            @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
            }

            @media (max-width: 640px) {
            :host {
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                max-width: unset;
                right: 0.5rem;
                left: 0.5rem;
            }

            @keyframes slideIn {
                from {
                transform: translate(-50%, calc(-50% - 10px));
                opacity: 0;
                }
                to {
                transform: translate(-50%, -50%);
                opacity: 1;
                }
            }
        }

        .header {
          background: #fff7ed;
          color: #ea580c;
          font-weight: bold;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .body {
          padding: 1rem;
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .body img {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: 0.375rem;
        }

        .details {
          flex: 1;
        }

        .details .name {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .details .price,
        .details .qty {
          color: #374151;
          font-size: 0.875rem;
        }

        .actions {
          padding: 1rem;
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .actions a {
          flex: 1;
          text-align: center;
          text-decoration: none;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
        }

        .actions a.cart {
          background-color: #f97316;
          transition: background-color 0.2s ease;
        }
        .actions a.cart:hover {
          background-color: #ea580c;
        }

        .actions a.checkout {
          background-color: #000000;
          transition: background-color 0.2s ease;
        }
        .actions a.checkout:hover {
          background-color: #111111;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          color: #ea580c;
          cursor: pointer;
        }

        @media (max-width: 480px) {
          :host {
            right: 0.5rem;
            left: 0.5rem;
            max-width: unset;
          }
        }
      </style>

      <div class="header">
        <span>Added to cart</span>
        <button class="close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="body">
        <img src="" alt="Product image" />
        <div class="details">
          <div class="name"></div>
          <div class="qty"></div>
          <div class="price"></div>
        </div>
      </div>
      <div class="actions">
        <a class="cart" href="/cart">View My Cart</a>
        <a class="checkout" href="/checkout">Checkout</a>
      </div>
    `;
  }

  showNotification({ name, image, price, quantity }) {
    const productImg = this.shadowRoot.querySelector('img');
    const productName = this.shadowRoot.querySelector('.name');
    const productPrice = this.shadowRoot.querySelector('.price');
    const productQty = this.shadowRoot.querySelector('.qty');

    productImg.src = image;
    productImg.alt = name;
    productName.textContent = name;
    productQty.textContent = `Quantity: ${quantity}`;
    productPrice.textContent = `Price: $${(price / 100).toFixed(2)}`;

    this.style.display = 'block';

    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => this.hide(), 8000);
  }

  hide() {
    this.style.display = 'none';
  }
}

customElements.define('cart-notification', CartNotification);

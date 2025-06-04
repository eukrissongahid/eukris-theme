class CollectionGrid extends HTMLElement {
  connectedCallback() {
    this._onFiltersChanged = () => this.updateGridOnly();
    document.addEventListener('filters:changed', this._onFiltersChanged);
  }

  disconnectedCallback() {
    document.removeEventListener('filters:changed', this._onFiltersChanged);
  }

  updateGridOnly() {
    const form = document.querySelector('collection-filters #CollectionFiltersForm');
    if (!form) return;

    const params = new URLSearchParams(new FormData(form)).toString();
    const baseUrl = form.getAttribute('action') || window.location.pathname;
    const url = `${baseUrl}?${params}`;

    fetch(`${url}&sections=main-collection-product-grid`)
      .then((res) => res.json())
      .then((data) => {
        if (data['main-collection-product-grid']) {
          this.innerHTML = data['main-collection-product-grid'];
        }
      });
  }
}

customElements.define('collection-grid', CollectionGrid);

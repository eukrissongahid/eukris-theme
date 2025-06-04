class CollectionFilters extends HTMLElement {
  connectedCallback() {
    this.attachCheckboxListeners();
  }

  disconnectedCallback() {
    this.detachCheckboxListeners();
  }

  attachCheckboxListeners() {
    const form = this.querySelector('#CollectionFiltersForm');
    if (!form) return;

    this._boundListeners = [];

    form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      const listener = () => {
        this.updateFiltersOnly();
        document.dispatchEvent(new CustomEvent('filters:changed'));
      };
      checkbox.addEventListener('change', listener);
      this._boundListeners.push({ checkbox, listener });
    });
  }

  detachCheckboxListeners() {
    if (!this._boundListeners) return;

    this._boundListeners.forEach(({ checkbox, listener }) => {
      checkbox.removeEventListener('change', listener);
    });

    this._boundListeners = [];
  }

  updateFiltersOnly() {
    const form = this.querySelector('#CollectionFiltersForm');
    if (!form) return;

    const params = new URLSearchParams(new FormData(form)).toString();
    const baseUrl = form.getAttribute('action') || window.location.pathname;
    const url = `${baseUrl}?${params}`;

    fetch(`${url}&sections=main-collection-filters`)
      .then((res) => res.json())
      .then((data) => {
        if (data['main-collection-filters']) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(data['main-collection-filters'], 'text/html');
          const newForm = doc.querySelector('#CollectionFiltersForm');

          if (newForm) {
            this.detachCheckboxListeners();
            this.querySelector('#CollectionFiltersForm').replaceWith(newForm);
            this.attachCheckboxListeners();
          }
        }

        window.history.pushState({}, '', url);
      });
  }
}

customElements.define('collection-filters', CollectionFilters);

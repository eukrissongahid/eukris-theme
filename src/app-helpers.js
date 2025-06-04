function formatCurrency(amountInCents, currencyCode = 'PHP', locale = undefined) {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode
  });
  return formatter.format(amountInCents / 100);
}
window.formatCurrency = formatCurrency;

function showToast({ type = 'success', message = '', duration = 4000 }) {
  const colors = {
    success: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
    danger: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
    warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    info: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }
  };

  const { bg, border, text } = colors[type] || colors.success;

  const toast = document.createElement('div');
  toast.classList.add('toast');

  toast.innerHTML = `
    <div
      class="flex items-center px-5 py-2.5 rounded-lg shadow-md mb-2"
      role="alert"
      tabindex="0"
      aria-live="assertive"
      aria-atomic="true"
      style="background-color: ${bg}; color: ${text}; border-left: 4px solid ${border};"
    >
      <div class="flex-grow text-sm leading-5 select-text">${message}</div>
      <button
        type="button"
        class="ml-auto text-xl cursor-pointer opacity-60 select-none transition-opacity duration-200 hover:opacity-100 focus:opacity-100"
        aria-label="Close toast"
      >&times;</button>
    </div>
  `;

  const closeBtn = toast.querySelector('button');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  const container = document.getElementById('toast-container');
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}
window.showToast = showToast;

function initSearchFormHandler() {
  const form = document.getElementById('searchForm');
  const resultsContainer = document.getElementById('searchResults');

  if (!form || !resultsContainer) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const query = new URLSearchParams(new FormData(form)).toString();

    fetch(`${form.action}?${query}`)
      .then((res) => res.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newResults = doc.querySelector('#searchResults');

        if (newResults) {
          const productCards = newResults.querySelectorAll('.product-card');
          if (productCards.length > 0) {
            resultsContainer.innerHTML = newResults.innerHTML;
          } else {
            resultsContainer.innerHTML = `
              <div class='my-10 text-center'>
                <p>No results found for the search term: "${form.q.value}". Try a different keyword.</p>
              </div>`;
          }
        } else {
          resultsContainer.innerHTML = `
            <div class='my-10 text-center'>
              <p>No results found for the search term: "${form.q.value}". Try a different keyword.</p>
            </div>`;
        }
      })
      .catch((err) => {
        showToast({ type: 'danger', message: `Search failed: ${err}` });
      });
  });
}
window.initSearchFormHandler = initSearchFormHandler;

function toggleVisibilityOnClick(buttonId, targetId, show = true) {
  const button = document.getElementById(buttonId);
  const target = document.getElementById(targetId);
  if (!button || !target) return;

  button.addEventListener('click', () => {
    if (show) {
      target.classList.remove('hidden');
    } else {
      target.classList.add('hidden');
    }
  });
}
window.toggleVisibilityOnClick = toggleVisibilityOnClick;

function setupToggleButtons(selector) {
  document.querySelectorAll(selector).forEach((button) => {
    const targetId = button.getAttribute('data-target');
    const target = document.getElementById(targetId);
    if (!target) return;

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      target.classList.toggle('hidden');
    });
  });
}
window.setupToggleButtons = setupToggleButtons;

function initUIInteractions() {
  toggleVisibilityOnClick('mobile-menu-open', 'mobile-menu', true);
  toggleVisibilityOnClick('mobile-menu-close', 'mobile-menu', false);

  document.querySelectorAll('.search-bar-open').forEach((button) => {
    const target = document.getElementById('search-bar');
    if (!target) return;

    button.addEventListener('click', () => {
      target.classList.remove('hidden');
    });
  });

  toggleVisibilityOnClick('search-bar-close', 'search-bar', false);

  setupToggleButtons('.menu-dropdown-toggle');
  setupToggleButtons('.mobile-submenu-toggle');

  document.addEventListener('click', () => {
    document.querySelectorAll('[id^="submenu-"]').forEach((submenu) => {
      submenu.classList.add('hidden');
    });
  });
}
window.initUIInteractions = initUIInteractions;

document.addEventListener('DOMContentLoaded', () => {
  initUIInteractions();
  initSearchFormHandler();
});

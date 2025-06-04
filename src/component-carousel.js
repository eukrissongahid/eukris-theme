class ShopCarousel extends HTMLElement {
  static SLIDE_TRANSITION_DURATION_MS = 500;

  static TOUCH_SWIPE_THRESHOLD_PX = 50;

  static DEFAULT_AUTOPLAY_SPEED_MS = 5000;

  static DEFAULT_CAROUSEL_HEIGHT_PX = 400;

  static CAROUSEL_HEIGHTS_BY_BREAKPOINT = {
    mobile: 200,
    tablet: 250,
    desktop: 400,
    largeDesktop: 600,
    ultraWide: 800
  };
  static NAV_BUTTON_SIZE_PX = 40;
  static NAV_BUTTON_BG_OPACITY = 0.4;
  static NAV_BUTTON_FONT_SIZE_REM = 1.5;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.hasConnected = false;
    this.intervalId = null;
    this.startX = 0;
    this.endX = 0;
    this.isTransitioning = false;
  }

  connectedCallback() {
    if (this.hasConnected) return;
    this.hasConnected = true;

    let slides = [];
    try {
      slides = JSON.parse(this.dataset.slides ?? '[]');
    } catch (e) {
      console.warn('Invalid slide data:', e);
    }

    const autoplay = this.dataset.autoplay === 'true';
    const speed = parseInt(this.dataset.speed) || ShopCarousel.DEFAULT_AUTOPLAY_SPEED_MS;

    this.autoplayEnabled = autoplay;
    this.autoplaySpeed = speed;

    if (!Array.isArray(slides) || slides.length === 0) {
      this.shadowRoot.innerHTML = `<style>:host { display: none; }</style>`;
      return;
    }

    this.render(slides);
    this.addKeyboardNavigation();
    this.addTouchSupport();

    if (autoplay) this.startAutoScroll(speed);
  }

  escapeHTML(str) {
    return (
      str?.replace(
        /[&<>"']/g,
        (m) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          })[m]
      ) ?? ''
    );
  }

  render(slides) {
    const slidesWithDuplicate = [...slides, slides[0]];

    const style = `
      <style>
        :host {
          display: block;
        }
        .carousel-container {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: ${ShopCarousel.DEFAULT_CAROUSEL_HEIGHT_PX}px;
        }
        .slides {
          display: -webkit-box;
          display: -ms-flexbox;
          display: flex;
          -webkit-transition: -webkit-transform ${ShopCarousel.SLIDE_TRANSITION_DURATION_MS}ms ease;
          transition: transform ${ShopCarousel.SLIDE_TRANSITION_DURATION_MS}ms ease;
          width: 100%;
          height: 100%;
        }
        .slide {
          -webkit-box-flex: 0;
          -ms-flex: 0 0 100%;
          flex: 0 0 100%;
          -webkit-box-sizing: border-box;
          -moz-box-sizing: border-box;
          box-sizing: border-box;
          overflow: hidden;
          height: 100%;
        }
        .slide img {
          width: 100%;
          height: 100%;
          -o-object-fit: fill;
          object-fit: fill;
          display: block;
        }
        @media (max-width: 480px) {
          .carousel-container {
            height: ${ShopCarousel.CAROUSEL_HEIGHTS_BY_BREAKPOINT.mobile}px !important;
          }
        }
        @media (max-width: 768px) {
          .carousel-container {
            height: ${ShopCarousel.CAROUSEL_HEIGHTS_BY_BREAKPOINT.tablet}px;
          }
        }
        @media (min-width: 1400px) {
          .carousel-container {
            height: ${ShopCarousel.CAROUSEL_HEIGHTS_BY_BREAKPOINT.largeDesktop}px;
          }
        }
        @media (min-width: 1920px) {
          .carousel-container {
            height: ${ShopCarousel.CAROUSEL_HEIGHTS_BY_BREAKPOINT.ultraWide}px;
          }
        }
        .nav-button {
          position: absolute;
          top: 50%;
          -webkit-transform: translateY(-50%);
          -ms-transform: translateY(-50%);
          transform: translateY(-50%);
          background: rgba(0, 0, 0, ${ShopCarousel.NAV_BUTTON_BG_OPACITY});
          color: white;
          font-size: ${ShopCarousel.NAV_BUTTON_FONT_SIZE_REM}rem;
          border: none;
          cursor: pointer;
          z-index: 10;
          -webkit-border-radius: 50%;
          -moz-border-radius: 50%;
          border-radius: 50%;
          width: ${ShopCarousel.NAV_BUTTON_SIZE_PX}px;
          height: ${ShopCarousel.NAV_BUTTON_SIZE_PX}px;
          padding: 0;
          display: -webkit-box;
          display: -ms-flexbox;
          display: flex;
          -webkit-box-align: center;
          -ms-flex-align: center;
          align-items: center;
          -webkit-box-pack: center;
          -ms-flex-pack: center;
          justify-content: center;
        }
        .prev { left: 1rem; }
        .next { right: 1rem; }
      </style>
    `;

    const slidesHtml = slidesWithDuplicate
      .map(({ image, alt, link }) => {
        const escapedImage = image
          ? `<img src="${this.escapeHTML(image)}" alt="${this.escapeHTML(alt ?? 'Slide')}" loading="lazy" decoding="async" />`
          : '';
        const linkStart = link ? `<a href="${this.escapeHTML(link)}">` : '';
        const linkEnd = link ? `</a>` : '';
        return `<div class="slide">${linkStart}${escapedImage}${linkEnd}</div>`;
      })
      .join('');

    this.shadowRoot.innerHTML = `
      ${style}
      <div class="carousel-container" tabindex="0">
        <div class="slides">${slidesHtml}</div>
        <button class="nav-button prev" aria-label="Previous Slide">&#10094;</button>
        <button class="nav-button next" aria-label="Next Slide">&#10095;</button>
      </div>
    `;

    this.slidesEl = this.shadowRoot.querySelector('.slides');
    this.prevBtn = this.shadowRoot.querySelector('.prev');
    this.nextBtn = this.shadowRoot.querySelector('.next');
    this.totalSlides = slides.length;
    this.currentIndex = 0;

    this.prevBtn.addEventListener('click', () => this.changeSlide(-1));
    this.nextBtn.addEventListener('click', () => this.changeSlide(1));

    this.slidesEl.addEventListener('transitionstart', () => {
      this.isTransitioning = true;
      this.prevBtn.disabled = true;
      this.nextBtn.disabled = true;
    });

    this.slidesEl.addEventListener('transitionend', () => {
      this.isTransitioning = false;
      this.prevBtn.disabled = false;
      this.nextBtn.disabled = false;

      if (this.currentIndex === this.totalSlides) {
        this.slidesEl.style.transition = 'none';
        this.currentIndex = 0;
        this.slidesEl.style.transform = `translateX(-${this.currentIndex * 100}%)`;

        void this.slidesEl.offsetWidth;
        this.slidesEl.style.transition = `transform ${ShopCarousel.SLIDE_TRANSITION_DURATION_MS}ms ease`;
      }
    });
  }

  changeSlide(direction) {
    if (this.isTransitioning) return;

    if (direction === -1 && this.currentIndex === 0) {
      this.isTransitioning = true;
      this.prevBtn.disabled = true;
      this.nextBtn.disabled = true;

      this.slidesEl.style.transition = 'none';
      this.currentIndex = this.totalSlides;
      this.slidesEl.style.transform = `translateX(-${this.currentIndex * 100}%)`;
      void this.slidesEl.offsetWidth;

      this.slidesEl.style.transition = `transform ${ShopCarousel.SLIDE_TRANSITION_DURATION_MS}ms ease`;
      this.currentIndex = this.totalSlides - 1;

      requestAnimationFrame(() => {
        this.slidesEl.style.transform = `translateX(-${this.currentIndex * 100}%)`;
      });

      if (this.autoplayEnabled) {
        clearInterval(this.intervalId);
        this.startAutoScroll(this.autoplaySpeed);
      }
      return;
    }

    this.isTransitioning = true;
    this.prevBtn.disabled = true;
    this.nextBtn.disabled = true;

    this.currentIndex += direction;

    if (this.currentIndex > this.totalSlides) {
      this.currentIndex = 0;
    } else if (this.currentIndex < 0) {
      this.currentIndex = this.totalSlides - 1;
    }

    this.slidesEl.style.transform = `translateX(-${this.currentIndex * 100}%)`;

    if (this.autoplayEnabled) {
      clearInterval(this.intervalId);
      this.startAutoScroll(this.autoplaySpeed);
    }
  }

  startAutoScroll(speed) {
    this.intervalId = setInterval(() => this.changeSlide(1), speed);
  }

  addKeyboardNavigation() {
    this.shadowRoot.querySelector('.carousel-container').addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'ArrowLeft') this.changeSlide(-1);
        if (e.key === 'ArrowRight') this.changeSlide(1);
      },
      { passive: true }
    );
  }

  addTouchSupport() {
    const container = this.shadowRoot.querySelector('.carousel-container');

    container.addEventListener('touchstart', (e) => {
      this.startX = e.touches[0].clientX;
    });

    container.addEventListener('touchend', (e) => {
      this.endX = e.changedTouches[0].clientX;
      const deltaX = this.endX - this.startX;
      if (Math.abs(deltaX) > ShopCarousel.TOUCH_SWIPE_THRESHOLD_PX) {
        this.changeSlide(deltaX > 0 ? -1 : 1);
      }
    });
  }

  disconnectedCallback() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}

customElements.define('shop-carousel', ShopCarousel);

const eventTarget = new EventTarget();

export const AppEvent = {
  on(event, callback, options) {
    eventTarget.addEventListener(event, callback, options);
  },
  off(event, callback, options) {
    eventTarget.removeEventListener(event, callback, options);
  },
  emit(event, detail = {}) {
    eventTarget.dispatchEvent(new CustomEvent(event, { detail }));
  }
};

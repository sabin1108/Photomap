(() => {
  const supported = PerformanceObserver.supportedEntryTypes;
  const data = { supported, entries: {}, raf: [], scroll: [], input: [], visibility: [], marks: {}, overflow: false, modal: null };
  const observers = [];
  let active = false;
  let enabled = false;
  const push = (array, value) => { if (array.length < 30000) array.push(value); else data.overflow = true; };
  const fields = ['name', 'entryType', 'startTime', 'duration', 'blockingDuration', 'renderStart', 'styleAndLayoutStart', 'firstUIEventTimestamp', 'processingStart', 'processingEnd', 'interactionId', 'cancelable'];
  function collect(type, entries) {
    for (const entry of entries) {
      const record = {};
      for (const key of fields) if (entry[key] !== undefined) record[key] = entry[key];
      if (entry.target?.closest) record.targetPhotoId = entry.target.closest('[data-photo-id]')?.dataset.photoId ?? null;
      push(data.entries[type], record);
    }
  }
  function raf(timestamp) {
    if (!active) return;
    if (enabled) push(data.raf, timestamp);
    requestAnimationFrame(raf);
  }
  document.addEventListener('visibilitychange', () => push(data.visibility, { at: performance.now(), state: document.visibilityState }));
  for (const type of ['pointerdown', 'pointerup', 'click']) {
    document.addEventListener(type, event => {
      if (!active) return;
      const record = { type, eventTime: event.timeStamp, receivedAt: performance.now(), photoId: event.target.closest?.('[data-photo-id]')?.dataset.photoId ?? null, trusted: event.isTrusted, x: event.clientX, y: event.clientY };
      push(data.input, record);
      if (type !== 'click') return;
      data.modal = { click: record, readyAt: null, decodedAt: null, twoRafAt: null, modalId: null, timedOut: false };
      const deadline = performance.now() + 5000;
      let decoding = false;
      const poll = () => {
        if (!active || data.modal.readyAt !== null) return;
        const modal = document.querySelector('[data-photo-modal-id]');
        const img = modal?.querySelector('img[data-image-variant]');
        if (modal) data.modal.modalId = modal.dataset.photoModalId;
        if (modal && img?.complete && img.naturalWidth > 0 && modal.getBoundingClientRect().height > 0 && !decoding) {
          decoding = true;
          img.decode().then(() => {
            if (!active) return;
            data.modal.decodedAt = performance.now();
            if (modal.isConnected && modal.dataset.photoModalId === record.photoId) {
              data.modal.readyAt = performance.now();
              requestAnimationFrame(() => requestAnimationFrame(() => { data.modal.twoRafAt = performance.now(); }));
            }
          }).catch(() => { data.modal.decodeFailed = true; });
        }
        if (performance.now() >= deadline) { data.modal.timedOut = true; return; }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    }, true);
  }
  window.uxProbe = {
    start(instrumentation = true) {
      enabled = instrumentation;
      active = true;
      data.enabled = enabled;
      data.timeOrigin = performance.timeOrigin;
      data.initialVisibility = document.visibilityState;
      data.marks.start = performance.now();
      for (const type of ['long-animation-frame', 'longtask', 'event']) {
        data.entries[type] = supported.includes(type) && enabled ? [] : null;
        if (!supported.includes(type) || !enabled) continue;
        const observer = new PerformanceObserver(list => collect(type, list.getEntries()));
        observer.observe(type === 'event' ? { type, buffered: false, durationThreshold: 16 } : { type, buffered: false });
        observers.push({ observer, type });
      }
      const el = document.querySelector('[data-benchmark-feed]');
      el.addEventListener('scroll', () => { if (active) push(data.scroll, { at: performance.now(), top: el.scrollTop }); }, { passive: true });
      if (enabled) requestAnimationFrame(raf);
    },
    mark(name) { data.marks[name] = performance.now(); return data.marks[name]; },
    modalStatus() { return data.modal; },
    finish() {
      data.marks.finish = performance.now();
      for (const { observer, type } of observers) { collect(type, observer.takeRecords()); observer.disconnect(); }
      active = false;
      const feed = document.querySelector('[data-benchmark-feed]');
      data.finalSelection = feed.dataset.selectedPhotoId ?? null;
      data.finalVisibility = document.visibilityState;
      return data;
    },
  };
})();

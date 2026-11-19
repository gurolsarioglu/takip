'use strict';

globalThis.TerminalWorkspace = (() => {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const equalShares = () => [.25, .25, .25, .25];

  function mount({ root, grid, store }) {
    const view = root.ownerDocument.defaultView;
    const desktop = view.matchMedia('(min-width: 1061px)');
    const style = view.getComputedStyle(root);
    const px = name => parseFloat(style.getPropertyValue(name));
    const chartMin = px('--chart-min'), chartGap = px('--chart-gap');
    const sideMin = px('--sidebar-min'), sideMax = px('--sidebar-max');
    const sideDefault = px('--sidebar-default'), sideGap = px('--sidebar-gap');
    if (![chartMin, chartGap, sideMin, sideMax, sideDefault, sideGap].every(Number.isFinite)) return;

    const handles = [...root.querySelectorAll('[data-split]')];
    const saved = store.get('workspace', null);
    const weights = saved?.shares;
    const sum = Array.isArray(weights) && weights.length === 4 && weights.every(n => Number.isFinite(n) && n >= 0 && n <= 1)
      ? weights.reduce((a, b) => a + b, 0) : 0;
    let shares = sum ? weights.map(n => n / sum) : equalShares();
    let sidebar = Number.isFinite(saved?.sidebar) ? clamp(saved.sidebar, sideMin, sideMax) : sideDefault;
    let drag = null, frame = null, width = root.clientWidth;

    function metrics() {
      const fixed = chartMin * 4 + chartGap * 3 + sideGap;
      const maxSide = clamp(width - fixed, sideMin, sideMax);
      const side = clamp(sidebar, sideMin, maxSide);
      return { maxSide, side, extra: Math.max(0, width - fixed - side) };
    }

    function render() {
      const { maxSide, side, extra } = metrics();
      root.style.setProperty('--sidebar-width', `${side}px`);
      shares.forEach((share, i) => root.style.setProperty(`--chart-${i + 1}`, share));
      for (const handle of handles) {
        const split = handle.dataset.split, i = Number(split), isSide = split === 'sidebar';
        const min = isSide ? sideMin : chartMin;
        const max = isSide ? maxSide : chartMin + (shares[i] + shares[i + 1]) * extra;
        const now = Math.round(isSide ? side : chartMin + shares[i] * extra);
        handle.setAttribute('aria-valuemin', Math.round(min));
        handle.setAttribute('aria-valuemax', Math.round(max));
        handle.setAttribute('aria-valuenow', now);
        handle.setAttribute('aria-valuetext', `${now} px`);
      }
    }

    const enabled = split => desktop.matches && (split === 'sidebar' || !grid.classList.contains('max'));
    const persist = () => store.set('workspace', { shares, sidebar });
    const snapshot = split => ({ split, shares, sidebar, ...metrics() });
    function move(start, dx) {
      if (start.split === 'sidebar') {
        const next = clamp(start.side - dx, sideMin, start.maxSide);
        sidebar = next === start.side ? start.sidebar : next;
      } else if (start.extra > 0) {
        const i = Number(start.split), pair = start.shares[i] + start.shares[i + 1];
        const next = clamp(start.shares[i] + dx / start.extra, 0, pair);
        shares = start.shares.slice();
        shares[i] = next;
        shares[i + 1] = pair - next;
      }
      render();
    }

    function finish(cancel, x) {
      if (!drag) return;
      const start = drag;
      drag = null;
      if (frame !== null) view.cancelAnimationFrame(frame);
      frame = null;
      if (cancel) {
        ({ shares, sidebar } = start);
        render();
      } else {
        move(start, x - start.x);
        persist();
      }
      start.handle.classList.toggle('dragging', false);
      if (start.handle.hasPointerCapture(start.id)) start.handle.releasePointerCapture(start.id);
    }

    for (const handle of handles) {
      const split = handle.dataset.split;
      const owns = e => drag?.id === e.pointerId && drag.handle === handle;
      handle.addEventListener('pointerdown', e => {
        if (drag || !enabled(split) || !e.isPrimary || e.button !== 0) return;
        handle.setPointerCapture(e.pointerId);
        drag = { ...snapshot(split), handle, id: e.pointerId, x: e.clientX, lastX: e.clientX };
        handle.classList.toggle('dragging', true);
      });
      handle.addEventListener('pointermove', e => {
        if (!owns(e)) return;
        drag.lastX = e.clientX;
        if (frame === null) frame = view.requestAnimationFrame(() => {
          frame = null;
          if (enabled(drag.split)) move(drag, drag.lastX - drag.x);
          else finish(true);
        });
      });
      handle.addEventListener('pointerup', e => { if (owns(e)) finish(!enabled(split), e.clientX); });
      handle.addEventListener('pointercancel', e => { if (owns(e)) finish(true); });
      handle.addEventListener('lostpointercapture', e => { if (owns(e)) finish(true); });
      handle.addEventListener('keydown', e => {
        if (e.key === 'Escape' && drag?.handle === handle) { e.preventDefault(); finish(true); return; }
        if (drag || !enabled(split) || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
        e.preventDefault();
        move(snapshot(split), (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 32 : 8));
        persist();
      });
      handle.addEventListener('dblclick', () => {
        if (drag || !enabled(split)) return;
        if (split === 'sidebar') sidebar = sideDefault;
        else {
          const i = Number(split);
          shares[i] = shares[i + 1] = (shares[i] + shares[i + 1]) / 2;
        }
        render();
        persist();
      });
    }

    const resize = () => {
      if (width === root.clientWidth) return;
      width = root.clientWidth;
      if (drag) finish(true);
      else render();
    };
    if (view.ResizeObserver) new view.ResizeObserver(resize).observe(root);
    else view.addEventListener('resize', resize);
    render();
  }

  return { mount };
})();

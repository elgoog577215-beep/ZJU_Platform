import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** 对齐原型 zju-ai-community.js initPodcastFloatSchemeC */
const ORB = 56;
const PAD = 14;
const TOP_EXTRA = 20;
const orbSlide = true;

function viewSize() {
  return { w: window.innerWidth, h: window.innerHeight };
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function isInteractiveTarget(el) {
  if (!el || !el.closest) return false;
  return !!el.closest("button, a, input, textarea, select, [role='button']");
}

export default function CommunityPodcastFloat() {
  const { t } = useTranslation();
  const podRef = useRef(null);
  const dragInitRef = useRef(false);
  const sideRef = useRef('left');
  const isOrbRef = useRef(false);
  const stateRef = useRef({
    dragging: false,
    orbDrag: false,
    orbMaybeTap: false,
    orbDidDrag: false,
    suppressClick: false,
    dx: 0,
    dy: 0,
    orbPtrY0: 0,
    orbTop0: 0,
    captureId: null,
  });

  const [collapsed, setCollapsed] = useState(false);
  const [isOrb, setIsOrb] = useState(false);
  const [podAnim, setPodAnim] = useState(false);

  const topMin = () => PAD + TOP_EXTRA;
  const bottomPad = () => PAD;

  const ensureTopLeftFromCss = useCallback(() => {
    const pod = podRef.current;
    if (!pod || dragInitRef.current) return;
    const r = pod.getBoundingClientRect();
    pod.style.bottom = 'auto';
    pod.style.right = 'auto';
    pod.style.left = `${Math.round(r.left)}px`;
    pod.style.top = `${Math.round(r.top)}px`;
    dragInitRef.current = true;
  }, []);

  const expandedSize = useCallback(() => {
    const pod = podRef.current;
    return { w: pod?.offsetWidth ?? 0, h: pod?.offsetHeight ?? 0 };
  }, []);

  const clampExpandedPos = useCallback(() => {
    const pod = podRef.current;
    if (!pod) return;
    const vs = viewSize();
    const sh = expandedSize();
    let left = parseFloat(pod.style.left) || 0;
    let top = parseFloat(pod.style.top) || 0;
    const maxL = Math.max(PAD, vs.w - sh.w - PAD);
    const maxT = Math.max(topMin(), vs.h - sh.h - bottomPad());
    left = Math.max(PAD, Math.min(maxL, left));
    top = Math.max(topMin(), Math.min(maxT, top));
    pod.style.left = `${left}px`;
    pod.style.top = `${top}px`;
  }, [expandedSize]);

  const snapOrb = useCallback(
    (targetSide) => {
      const pod = podRef.current;
      if (!pod) return;
      sideRef.current = targetSide;
      ensureTopLeftFromCss();
      const vs = viewSize();
      const sh = expandedSize();
      let cy = parseFloat(pod.style.top) + sh.h / 2;
      cy = Math.max(topMin() + ORB / 2, Math.min(vs.h - bottomPad() - ORB / 2, cy));
      const top = cy - ORB / 2;

      if (!prefersReducedMotion()) setPodAnim(true);
      setCollapsed(false);
      setIsOrb(true);
      isOrbRef.current = true;

      pod.setAttribute('tabindex', '0');
      pod.style.width = `${ORB}px`;
      pod.style.height = `${ORB}px`;
      pod.style.minWidth = '0';
      pod.style.borderRadius = '50%';
      pod.style.padding = '0';

      if (targetSide === 'left') {
        pod.style.left = `${PAD}px`;
        pod.style.right = 'auto';
      } else {
        pod.style.right = `${PAD}px`;
        pod.style.left = 'auto';
      }
      pod.style.top = `${top}px`;

      setTimeout(() => setPodAnim(false), 300);

      stateRef.current.suppressClick = true;
      setTimeout(() => {
        stateRef.current.suppressClick = false;
      }, 80);
    },
    [ensureTopLeftFromCss, expandedSize]
  );

  const expandFromOrb = useCallback(() => {
    const pod = podRef.current;
    if (!pod) return;
    ensureTopLeftFromCss();
    const vs = viewSize();
    let top = parseFloat(pod.style.top) || topMin();

    if (!prefersReducedMotion()) setPodAnim(true);

    setIsOrb(false);
    isOrbRef.current = false;
    pod.setAttribute('tabindex', '-1');
    pod.style.width = '';
    pod.style.height = '';
    pod.style.minWidth = '';
    pod.style.borderRadius = '';
    pod.style.padding = '';

    void pod.offsetHeight;
    const sh = expandedSize();
    let newTop = Math.min(top, vs.h - sh.h - bottomPad());
    newTop = Math.max(topMin(), newTop);

    if (sideRef.current === 'left') {
      pod.style.left = `${PAD}px`;
      pod.style.right = 'auto';
    } else {
      pod.style.left = `${vs.w - sh.w - PAD}px`;
      pod.style.right = 'auto';
    }
    pod.style.top = `${newTop}px`;

    setTimeout(() => setPodAnim(false), 300);
  }, [ensureTopLeftFromCss, expandedSize]);

  const snapOrbRef = useRef(snapOrb);
  snapOrbRef.current = snapOrb;
  const expandFromOrbRef = useRef(expandFromOrb);
  expandFromOrbRef.current = expandFromOrb;

  useLayoutEffect(() => {
    const pod = podRef.current;
    if (!pod || dragInitRef.current) return;
    const r = pod.getBoundingClientRect();
    pod.style.bottom = 'auto';
    pod.style.right = 'auto';
    pod.style.left = `${Math.round(r.left)}px`;
    pod.style.top = `${Math.round(r.top)}px`;
    dragInitRef.current = true;
  }, []);

  useEffect(() => {
    const pod = podRef.current;
    if (!pod) return;
    const st = stateRef.current;

    function endDrag(e) {
      st.dragging = false;
      st.orbDrag = false;
      st.orbMaybeTap = false;
      const id = e && e.pointerId != null ? e.pointerId : st.captureId;
      if (id != null) {
        try {
          pod.releasePointerCapture(id);
        } catch {
          /* ignore */
        }
      }
      st.captureId = null;
    }

    function onPointerMove(e) {
      if (!st.dragging) return;
      const vs = viewSize();

      if (st.orbDrag) {
        if (Math.abs(e.clientY - st.orbPtrY0) > 5) {
          st.orbDidDrag = true;
          st.orbMaybeTap = false;
        }
        let topRaw = st.orbTop0 + (e.clientY - st.orbPtrY0);
        const minT = topMin();
        const maxT = vs.h - ORB - bottomPad();
        topRaw = Math.max(minT, Math.min(maxT, topRaw));
        pod.style.top = `${topRaw}px`;
        if (sideRef.current === 'left') {
          pod.style.left = `${PAD}px`;
          pod.style.right = 'auto';
        } else {
          pod.style.right = `${PAD}px`;
          pod.style.left = 'auto';
        }
        return;
      }

      const sh = expandedSize();
      let left = e.clientX - st.dx;
      let top = e.clientY - st.dy;
      const maxL = Math.max(PAD, vs.w - sh.w - PAD);
      const maxT = Math.max(topMin(), vs.h - sh.h - bottomPad());
      left = Math.max(PAD, Math.min(maxL, left));
      top = Math.max(topMin(), Math.min(maxT, top));
      pod.style.left = `${left}px`;
      pod.style.top = `${top}px`;
      pod.style.right = 'auto';
    }

    function onPointerUp(e) {
      if (!st.dragging) return;

      if (st.orbDrag) {
        if (orbSlide && st.orbMaybeTap && !st.orbDidDrag) {
          expandFromOrbRef.current();
        }
        endDrag(e);
        return;
      }

      const vs = viewSize();
      const sh = expandedSize();
      const left = parseFloat(pod.style.left) || 0;
      const cx = left + sh.w / 2;
      snapOrbRef.current(cx < vs.w / 2 ? 'left' : 'right');
      endDrag(e);
    }

    function onPointerCancel(e) {
      if (!st.dragging) return;
      endDrag(e);
    }

    function onPointerDown(e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      ensureTopLeftFromCss();

      if (isOrbRef.current && orbSlide) {
        if (isInteractiveTarget(e.target)) return;
        st.dragging = true;
        st.orbDrag = true;
        st.orbMaybeTap = true;
        st.orbDidDrag = false;
        st.captureId = e.pointerId;
        pod.setPointerCapture(e.pointerId);
        st.orbPtrY0 = e.clientY;
        st.orbTop0 = parseFloat(pod.style.top) || topMin();
        return;
      }
      if (isOrbRef.current) return;

      if (isInteractiveTarget(e.target)) return;

      st.dragging = true;
      st.orbDrag = false;
      st.captureId = e.pointerId;
      pod.setPointerCapture(e.pointerId);
      const pr = pod.getBoundingClientRect();
      st.dx = e.clientX - pr.left;
      st.dy = e.clientY - pr.top;
    }

    function onPodClick(e) {
      if (st.suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        st.suppressClick = false;
        return;
      }
      if (isOrbRef.current && !orbSlide) {
        expandFromOrbRef.current();
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!isOrbRef.current) return;
        e.preventDefault();
        expandFromOrbRef.current();
      }
    }

    function onResize() {
      if (!dragInitRef.current) return;
      if (isOrbRef.current) {
        const vs = viewSize();
        let top = parseFloat(pod.style.top) || topMin();
        top = Math.max(topMin(), Math.min(vs.h - ORB - bottomPad(), top));
        pod.style.top = `${top}px`;
        if (sideRef.current === 'right') {
          pod.style.right = `${PAD}px`;
          pod.style.left = 'auto';
        }
      } else {
        clampExpandedPos();
      }
    }

    pod.addEventListener('pointerdown', onPointerDown);
    pod.addEventListener('click', onPodClick);
    pod.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('resize', onResize);

    return () => {
      pod.removeEventListener('pointerdown', onPointerDown);
      pod.removeEventListener('click', onPodClick);
      pod.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('resize', onResize);
    };
  }, [ensureTopLeftFromCss, clampExpandedPos, expandedSize]);

  const onToggleClick = (e) => {
    e.stopPropagation();
    if (isOrbRef.current) return;
    setCollapsed((c) => !c);
  };

  const className = [
    'podcast-float',
    collapsed ? 'collapsed' : '',
    isOrb ? 'is-orb' : '',
    podAnim ? 'pod-is-anim' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={podRef}
      className={className}
      role="region"
      tabIndex={-1}
      aria-label={isOrb ? t('community.podcast_aria_orb') : t('community.podcast_aria_drag')}
    >
      <span className="pod-orb-ico" aria-hidden="true">
        🎧
      </span>
      <div className="pod-head">
        <span>{t('community.podcast_title')}</span>
        <button
          type="button"
          data-podcast-toggle
          aria-expanded={!collapsed}
          title={t('community.podcast_toggle_title')}
          onClick={onToggleClick}
        >
          {collapsed ? '▸' : '▾'}
        </button>
      </div>
      <div className="pod-body">
        <div>
          <strong>{t('community.podcast_ep')}</strong> {t('community.podcast_ep_title')}
        </div>
        <div className="fake-bar">
          <span />
        </div>
        <span style={{ color: 'var(--muted)' }}>{t('community.podcast_hint')}</span>
      </div>
    </div>
  );
}

// The 3D map (opt-in until it is finished; the 2D map stays as an option). It reads the same store
// and issues the same commands as the 2D map (commands.ts), so orders, the minimap, the advisor's
// ring and jump-to work on either map.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Hex } from '../types';
import { isEliminated, useGame } from '../store';
import { hexEq, tileIndex } from '../hex';
import { moveSelected, rangedSelected, selectedOwnUnit } from '../commands';
import { pointerIntent, previewDestination } from '../map/intent';
import { previewRoute } from '../path';
import { UNIT_ACTIONS, orderUnit } from '../orders';
import { registerMapCamera, notifyMapCamera, takeMapHandoff } from '../map/camera';
import { useLandSound } from '../map/useLandSound';
import { setMapProjector } from '../map/screenPos';
import { gameplayFocusAllowed, gameplayKeyAllowed } from '../gameplayKeys';
import { mapPlayerColor } from '../map/style';
import { feel } from '../feel';
import { MapScene } from './scene';
import { PX } from './world';
import './map3d.css';

export default function Map3DView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bannersRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MapScene | null>(null);
  const views = useGame((s) => s.views);
  const seat = useGame((s) => s.seat);
  const selection = useGame((s) => s.selection);
  const orders = useGame((s) => s.orders[s.seat]);
  const mode = useGame((s) => s.mode);
  const focus = useGame((s) => s.focus);
  const pingMode = useGame((s) => s.pingMode);
  const view = views?.[seat] ?? null;
  const [hover, setHover] = useState<Hex | null>(null);

  // Swapped in from the 2D map: start where it was looking, not on the capital or an old jump-to.
  const handoff = useRef<ReturnType<typeof takeMapHandoff>>(null);
  const mountFocus = useRef(focus);
  /** The last jump-to this map has acted on (the one current at mount counts: it starts there or on the handed-over centre). */
  const appliedSeq = useRef(focus?.seq ?? 0);
  const firstView = useRef(true);

  // Scene lifetime.
  // The same land and sea sound as the 2D map (it reads the camera this view registers below).
  useLandSound();
  useEffect(() => {
    firstView.current = true; // a new scene (StrictMode remounts too) is placed again by the view effect
    handoff.current = takeMapHandoff(useGame.getState().focus?.seq ?? 0);
    const canvas = canvasRef.current!;
    const sc = new MapScene(canvas);
    sceneRef.current = sc;
    // Tests and local shot scripts reach the scene here (the 2D map exposes `legatumMap` the same way).
    (window as unknown as { legatumMap3d?: MapScene }).legatumMap3d = sc;
    const size = () => { sc.resize(canvas.clientWidth, canvas.clientHeight); sc.placeCamera(); notifyMapCamera(); };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    const unregister = registerMapCamera({
      viewport: () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const ground = 2 * sc.dist * Math.tan((sc.camera.fov * Math.PI) / 360) * sc.camera.aspect;
        return { x: sc.target.x * PX, y: sc.target.z * PX, zoom: w / Math.max(1, ground * PX), w, h };
      },
      focusSeq: () => appliedSeq.current,
      center: (x, y) => { sc.target.set(x / PX, 0, y / PX); sc.clampTarget(); sc.placeCamera(); notifyMapCamera(); },
    });
    setMapProjector((hex) => {
      const p = sc.project(hex);
      if (!p) return null;
      const r = canvas.getBoundingClientRect();
      return { x: r.left + p.x, y: r.top + p.y, radius: p.radius };
    });
    let raf = 0;
    const loop = () => {
      sc.frame();
      placeBanners();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unregister();
      setMapProjector(null);
      sc.dispose();
      sceneRef.current = null;
    };
  }, []);

  // A new view (turn, seat or fog change) rebuilds what changed.
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc || !view) return;
    sc.setView(view);
    if (firstView.current) {
      firstView.current = false;
      const from = handoff.current;
      const home = view.cities.find((c) => c.owner === view.me && c.is_capital) ?? view.cities.find((c) => c.owner === view.me) ?? view.units.find((u) => u.owner === view.me);
      if (from) { sc.target.set(from.x / PX, 0, from.y / PX); sc.clampTarget(); sc.placeCamera(); }
      else if (mountFocus.current) sc.centerOn(mountFocus.current.hex);
      else if (home) sc.centerOn(home.pos);
      notifyMapCamera();
    }
  }, [view]);

  // Jump-to requests (turn report lines, the advisor, Cities seen).
  useEffect(() => {
    if (!focus || focus === mountFocus.current || !sceneRef.current) return;
    sceneRef.current.centerOn(focus.hex); appliedSeq.current = focus.seq; notifyMapCamera();
  }, [focus]);

  // Overlays: hover ring, selection ring and the selected unit's route preview.
  const ownSel = useMemo(() => {
    if (!view || view.finished || isEliminated(view) || selection?.kind !== 'unit') return null;
    const u = view.units.find((x) => x.id === selection.id);
    return u && u.owner === view.me ? u : null;
  }, [view, selection]);
  const pendingMove = useMemo(() => {
    if (!ownSel) return null;
    const o = (orders ?? []).find((x) => UNIT_ACTIONS.has(x.type) && orderUnit(x) === ownSel.id);
    if (o?.type === 'MoveUnit' || o?.type === 'MoveUnitPath') return o.to;
    return o ? null : ownSel.goto;
  }, [ownSel, orders]);
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc || !view) return;
    const intent = hover && !pingMode ? pointerIntent(view, ownSel, hover, mode) : 'none';
    const target = pingMode ? null : previewDestination(intent, hover, null, pendingMove);
    let route: Hex[] = [];
    if (ownSel && target && !hexEq(target, ownSel.pos)) {
      const { path } = previewRoute(view, ownSel.pos, target, orders ?? [], ownSel.id, { avoidEnemyReach: true });
      if (path) route = [ownSel.pos, ...path.filter((h) => !hexEq(h, ownSel.pos))];
    }
    const selHex = selection?.kind === 'unit' ? view.units.find((u) => u.id === selection.id)?.pos
      : selection?.kind === 'city' ? view.cities.find((c) => c.id === selection.id)?.pos : null;
    sc.setOverlays({ hover, selected: selHex ?? null, route });
  }, [view, hover, ownSel, mode, pingMode, pendingMove, orders, selection]);

  // City banners: HTML over the scene, placed every frame.
  const placeBanners = () => {
    const sc = sceneRef.current, box = bannersRef.current;
    if (!sc || !box) return;
    for (const el of box.children as HTMLCollectionOf<HTMLElement>) {
      const q = Number(el.dataset.q), r = Number(el.dataset.r);
      const p = sc.project({ q, r }, 0.3);
      if (!p) { el.style.visibility = 'hidden'; continue; }
      el.style.visibility = '';
      el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
      el.classList.toggle('far', sc.dist > 14);
    }
  };

  // ---- input ----
  const drag = useRef<{ x: number; y: number; ground: { x: number; z: number } | null; moved: boolean } | null>(null);
  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const clickHex = (h: Hex) => {
    const s = useGame.getState();
    const v = s.views?.[s.seat];
    if (!v || tileIndex(h, v.width, v.height) < 0) return;
    if (s.pingMode) { s.sendPing(h); return; }
    if (s.mode === 'ranged' && !v.finished && !isEliminated(v)) { rangedSelected(h); return; }
    if (s.mode === 'move' && !v.finished && !isEliminated(v)) { moveSelected(h); return; }
    const here = v.units.filter((u) => hexEq(u.pos, h));
    const city = v.cities.find((c) => hexEq(c.pos, h));
    const unitCands = (own: boolean) => here.filter((u) => (u.owner === v.me) === own)
      .sort((a, b) => Number(b.military) - Number(a.military)).map((u) => ({ kind: 'unit' as const, id: u.id }));
    const cands: { kind: 'unit' | 'city'; id: number }[] = [...unitCands(true), ...(city ? [{ kind: 'city' as const, id: city.id }] : []), ...unitCands(false)];
    if (!cands.length) { s.select(null); return; }
    const cur = s.selection;
    const idx = cur ? cands.findIndex((c) => c.kind === cur.kind && c.id === cur.id) : -1;
    s.select(cands[(idx + 1) % cands.length]);
    feel.select();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    canvasRef.current?.focus({ preventScroll: true });
    if (e.button !== 0) return;
    const p = local(e);
    const g = sceneRef.current?.groundAt(p.x, p.y);
    drag.current = { x: p.x, y: p.y, ground: g ? { x: g.x, z: g.z } : null, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const sc = sceneRef.current;
    if (!sc) return;
    const p = local(e);
    const d = drag.current;
    if (d) {
      if (!d.moved && Math.hypot(p.x - d.x, p.y - d.y) > 4) d.moved = true;
      if (d.moved && d.ground) {
        const g = sc.groundAt(p.x, p.y);
        if (g) {
          sc.target.x -= g.x - d.ground.x; sc.target.z -= g.z - d.ground.z;
          sc.clampTarget(); sc.placeCamera(); notifyMapCamera();
        }
        setHover(null);
        return;
      }
    }
    const h = sc.pick(p.x, p.y);
    setHover((old) => (old && h && hexEq(old, h) ? old : h));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d || d.moved) return;
    const h = sceneRef.current?.pick(d.x, d.y);
    if (h) clickHex(h);
  };
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const p = local(e);
    const h = sceneRef.current?.pick(p.x, p.y);
    if (h && selectedOwnUnit()) moveSelected(h);
  };

  // Wheel zoom toward the cursor (non-passive, so the page never scrolls).
  useEffect(() => {
    const c = canvasRef.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const sc = sceneRef.current;
      if (!sc) return;
      const p = local(e);
      const before = sc.groundAt(p.x, p.y);
      const k = e.ctrlKey ? 0.012 : 0.0012;
      sc.dist = Math.min(34, Math.max(1.6, sc.dist * Math.exp(e.deltaY * k)));
      sc.placeCamera();
      const after = sc.groundAt(p.x, p.y);
      if (before && after) { sc.target.x += before.x - after.x; sc.target.z += before.z - after.z; sc.clampTarget(); sc.placeCamera(); }
      notifyMapCamera();
    };
    c.addEventListener('wheel', wheel, { passive: false });
    return () => c.removeEventListener('wheel', wheel);
  }, []);

  // Keyboard panning, as on the 2D map.
  useEffect(() => {
    const keys = new Set<string>();
    let raf = 0;
    const panKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    const stop = () => { keys.clear(); cancelAnimationFrame(raf); };
    const tick = () => {
      const sc = sceneRef.current;
      if (!sc || !gameplayFocusAllowed(document.activeElement, 'arrowup')) { stop(); return; }
      const sp = sc.dist * 0.015;
      if (keys.has('w') || keys.has('arrowup')) sc.target.z -= sp;
      if (keys.has('s') || keys.has('arrowdown')) sc.target.z += sp;
      if (keys.has('a') || keys.has('arrowleft')) sc.target.x -= sp;
      if (keys.has('d') || keys.has('arrowright')) sc.target.x += sp;
      sc.clampTarget(); sc.placeCamera(); notifyMapCamera();
      if (keys.size) raf = requestAnimationFrame(tick);
    };
    const down = (e: KeyboardEvent) => {
      if (!gameplayKeyAllowed(e)) return;
      const k = e.key.toLowerCase();
      if (!panKeys.includes(k)) return;
      e.preventDefault();
      if (!keys.size) raf = requestAnimationFrame(tick);
      keys.add(k);
    };
    const up = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); if (!keys.size) stop(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', stop);
    return () => { stop(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', stop); };
  }, []);

  const cities = view ? view.cities.filter((c) => view.tiles[tileIndex(c.pos, view.width, view.height)]?.explored) : [];
  return (
    <div className="map-wrap map3d-wrap">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        data-game-map
        data-overlay-slot="map-viewport"
        aria-label="3D world map. Press M for the 2D map."
        className="map-canvas map3d-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onContextMenu={onContextMenu}
      />
      <div ref={bannersRef} className="map3d-banners" aria-hidden="true">
        {cities.map((c) => (
          <div key={c.id} className={`map3d-banner${c.owner === view?.me ? ' mine' : ''}`} data-q={c.pos.q} data-r={c.pos.r}
            style={{ ['--pc' as string]: mapPlayerColor(c.owner) }}>
            <span className="pop">{c.population}</span>
            <span className="nm">{c.is_capital ? '★ ' : ''}{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

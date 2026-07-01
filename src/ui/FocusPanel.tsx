import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useAlbionStore } from '../store/useAlbionStore';

// Focus mode: kamera už se přiblížila (viz CameraRig). Panel s daty se objeví
// AŽ POTÉ, filmovým fade+slide — žádný okamžitý modal/popup.
const REVEAL_DELAY_MS = 900;

export function FocusPanel() {
  const focus = useAlbionStore((s) => s.focus);
  const closeFocus = useAlbionStore((s) => s.closeFocus);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focus) {
      setVisible(false);
      const t = setTimeout(() => setActiveHref(null), 400);
      return () => clearTimeout(t);
    }
    setActiveHref(focus.items[0].href);
    const t = setTimeout(() => setVisible(true), REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [focus]);

  useEffect(() => {
    if (!panelRef.current) return;
    if (visible) {
      gsap.fromTo(
        panelRef.current,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [visible]);

  if (!focus) return null;

  return (
    <div className="a3d-focus-scrim">
      {visible && (
        <div className="a3d-focus-panel" ref={panelRef}>
          <div className="a3d-focus-bar">
            <div className="a3d-focus-tabs">
              {focus.items.map((it) => (
                <button
                  key={it.href}
                  className={activeHref === it.href ? 'a3d-tab active' : 'a3d-tab'}
                  onClick={() => setActiveHref(it.href)}
                >
                  {it.label}
                </button>
              ))}
            </div>
            <button className="a3d-focus-close" onClick={closeFocus}>
              Zavřít
            </button>
          </div>
          {activeHref && <iframe key={activeHref} src={activeHref} title={focus.title} />}
        </div>
      )}
    </div>
  );
}

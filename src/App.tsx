import { useEffect, useRef } from "react";
import "./game/index.js";

// WARZAR: CRATE RUSH is plain-JS (window.WZ). React is only the thin shell that hosts it.
declare global {
  interface Window {
    WZ: { Main: { start: (host: HTMLElement) => void } };
  }
}

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (host.current) window.WZ.Main.start(host.current);
  }, []);
  return <div id="wz-host" ref={host} />;
}

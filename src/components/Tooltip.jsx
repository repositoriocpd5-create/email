import React, { useState, useRef, useEffect, useId, cloneElement } from 'react';
import { createPortal } from 'react-dom';

export function Tooltip({ label, children, shortcut }) {
  const [position, setPosition] = useState(null);
  const ref = useRef(null); const timer = useRef(); const id = useId();
  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => {
    if (!ref.current) return; const r = ref.current.getBoundingClientRect();
    setPosition({ left: Math.max(130, Math.min(window.innerWidth - 130, r.left + r.width / 2)), top: r.bottom + 9, above: r.bottom > window.innerHeight - 65 });
  }, 350); };
  const hide = () => { clearTimeout(timer.current); setPosition(null); };
  useEffect(() => () => clearTimeout(timer.current), []);
  return <span className="tooltip-anchor" ref={ref} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onClick={hide}>
    {cloneElement(children, { 'aria-describedby': position ? id : undefined })}
    {position && createPortal(<span id={id} role="tooltip" className={`tooltip ${position.above ? 'above' : ''}`} style={{ left: position.left, top: position.above ? ref.current.getBoundingClientRect().top - 9 : position.top }}>{label}{shortcut && <kbd>{shortcut}</kbd>}</span>, document.body)}
  </span>;
}

export function IconButton({ icon: Icon, label, shortcut, className = '', ...props }) {
  return <Tooltip label={label} shortcut={shortcut}><button className={`icon-button ${className}`} aria-label={label} type="button" {...props}><Icon size={18} strokeWidth={1.65} /></button></Tooltip>;
}


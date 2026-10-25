import { useId, useRef, useState } from 'react';
export default function Tabs({ label, items }) {
  const [selected, setSelected] = useState(0);
  const prefix = useId();
  const refs = useRef([]);
  function onKeyDown(event, index) {
    const next = event.key === 'ArrowRight' ? (index + 1) % items.length : event.key === 'ArrowLeft' ? (index - 1 + items.length) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setSelected(next); refs.current[next]?.focus();
  }
  return <div className="tabs"><div role="tablist" aria-label={label}>{items.map((item,index) => <button ref={element => { refs.current[index] = element; }} key={item.label} id={`${prefix}-tab-${index}`} role="tab" aria-selected={selected === index} aria-controls={`${prefix}-panel-${index}`} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={event => onKeyDown(event,index)}>{item.label}</button>)}</div>{items.map((item,index) => <div key={item.label} id={`${prefix}-panel-${index}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${index}`} hidden={selected !== index} tabIndex="0">{item.content}</div>)}</div>;
}

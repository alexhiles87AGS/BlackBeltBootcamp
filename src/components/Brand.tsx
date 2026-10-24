import React from 'react';

/** A small, crisp belt emblem; decorative when paired with the wordmark. */
export function BeltMark() {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <path d="M7 15h34v8H7zM18 21 11 35l7 4 9-16zM28 21l9 13-7 5-10-16z" fill="currentColor"/>
    <path d="m24 13 8 8-8 8-8-8z" fill="currentColor" stroke="#95122c" strokeWidth="3" strokeLinejoin="round"/>
  </svg>;
}

export function Brand({className=''}:{className?:string}) {
  return <span className={`brandIdentity ${className}`}>
    <span className="brandMark"><BeltMark/></span>
    <span className="brandWordmark"><span className="brandName">BlackBelt</span><span className="brandDescriptor">BOOTCAMP</span></span>
  </span>;
}

'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#030304] border-t border-[#13131a] px-8 py-4 mt-auto flex items-center justify-center">
      <a
        href="https://x.com/arcterminalai"
        target="_blank"
        rel="noreferrer"
        aria-label="X (Twitter)"
        className="p-2 rounded-lg bg-[#09090c] border border-[#13131a] text-[#8e8e9f] hover:text-white hover:border-[#8b5cf6]/40 hover:bg-[#13131c] transition-all duration-200"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
    </footer>
  );
}

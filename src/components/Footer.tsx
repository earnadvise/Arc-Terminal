'use client';

import React from 'react';
import { MessageSquare, Terminal, FileText, LifeBuoy, FileCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#030304] border-t border-[#13131a] px-8 py-6 mt-auto">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center font-bold text-[10px] tracking-wider">
            A
          </div>
          <p className="text-xs text-[#8e8e9f]">
            © 2026 Arc Terminal. Built exclusively for <span className="text-white font-medium">Arc Testnet</span>. Inspired by Tower Exchange.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#8e8e9f]">
          <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
            <FileText size={12} />
            Documentation
          </a>
          <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
            <Terminal size={12} />
            API Reference
          </a>
          <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
            <LifeBuoy size={12} />
            Support
          </a>
          <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
            <FileCheck size={12} />
            Terms of Use
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
        </div>

        {/* Socials */}
        <div className="flex items-center gap-4">
          {/* GitHub Inline SVG */}
          <a href="#" className="text-[#8e8e9f] hover:text-white transition-colors" aria-label="GitHub">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
          {/* Discord via Lucide MessageSquare */}
          <a href="#" className="text-[#8e8e9f] hover:text-white transition-colors" aria-label="Discord">
            <MessageSquare size={16} />
          </a>
          {/* Twitter / X Inline SVG */}
          <a href="#" className="text-[#8e8e9f] hover:text-white transition-colors" aria-label="Twitter">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

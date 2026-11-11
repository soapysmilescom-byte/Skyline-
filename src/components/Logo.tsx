/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGlow?: boolean;
}

export default function Logo({ className = '', size = 'md', showGlow = false }: LogoProps) {
  const sizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };
  const sizeClass = sizes[size] || sizes.md;

  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 ${className}`}>
      {showGlow && (
        <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-md pointer-events-none transform scale-110" />
      )}
      <div
        className={`${sizeClass} relative rounded-2xl bg-blue-600 p-[1.5px] shadow-lg shadow-blue-600/20 overflow-hidden flex items-center justify-center border border-blue-400/40`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500 to-blue-700" />
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-2 relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="pbBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#DBEAFE" />
            </linearGradient>
            <linearGradient id="bridgeLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
          </defs>
          {/* Bridge Cables and Pillars */}
          <path
            d="M20 72 L38 28 L38 72 M62 28 L62 72 L80 72"
            stroke="url(#pbBlueGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M38 32 C50 50, 50 50, 62 32"
            stroke="url(#bridgeLineGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <line
            x1="14"
            y1="72"
            x2="86"
            y2="72"
            stroke="url(#bridgeLineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect x="46" y="38" width="8" height="8" rx="1.5" fill="#BFDBFE" />
        </svg>
      </div>
    </div>
  );
}

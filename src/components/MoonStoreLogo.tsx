import React from 'react';

interface MoonStoreLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showIcon?: boolean;
  subtitle?: string;
}

export const MoonStoreLogo: React.FC<MoonStoreLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  showIcon = true,
  subtitle = 'TIENDA PARA MUJERES',
}) => {
  const sizeMap = {
    xs: { icon: 'w-7 h-7', text: 'text-sm', sub: 'text-[9px]', tracking: 'tracking-widest' },
    sm: { icon: 'w-8 h-8', text: 'text-base', sub: 'text-[10px]', tracking: 'tracking-widest' },
    md: { icon: 'w-10 h-10', text: 'text-lg', sub: 'text-[10px]', tracking: 'tracking-widest' },
    lg: { icon: 'w-12 h-12', text: 'text-xl', sub: 'text-xs', tracking: 'tracking-widest' },
    xl: { icon: 'w-16 h-16', text: 'text-2xl', sub: 'text-sm', tracking: 'tracking-widest' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center ${showIcon ? 'space-x-3' : ''} select-none ${className}`}>
      {/* Icon Emblem: Stylized M + Crescent Moon & Sparkle in Dusty Rose */}
      {showIcon && (
        <div
          className={`${currentSize.icon} relative rounded-xl bg-gradient-to-br from-[#FFF5F7] via-[#FCE7EC] to-[#FAD0DB] border border-[#F2BDCB] shadow-xs flex items-center justify-center shrink-0 overflow-hidden group`}
        >
          <svg
            viewBox="0 0 74 74"
            className="w-full h-full p-1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="logoRoseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D97A94" />
                <stop offset="50%" stopColor="#C86D85" />
                <stop offset="100%" stopColor="#AF536D" />
              </linearGradient>
              <linearGradient id="logoMoonGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EAA6B8" />
                <stop offset="100%" stopColor="#C86D85" />
              </linearGradient>
            </defs>

            {/* Delicate crescent moon aura */}
            <path
              d="M52 18 C59 27 57 41 48 49 C44 52 39 54 34 55 C45 52 51 38 46 27 C43 23 40 20 37 18 C42 18 47 18 52 18 Z"
              fill="url(#logoMoonGold)"
              opacity="0.38"
            />

            {/* Fluid calligraphic "M" */}
            <path
              d="M22 52 
                 C20 52 19 50 19 47 
                 C20 41 23 32 26 23 
                 C27 20 29 19 32 20 
                 C34 21 34 24 33 28 
                 C31 35 28 44 26 49 
                 C29 43 33 34 37 25 
                 C39 21 42 21 44 24 
                 C47 29 49 37 51 46 
                 C53 38 56 31 58 26 
                 C60 22 62 23 63 25 
                 C64 28 62 33 60 38 
                 C57 44 54 50 51 52 
                 C48 53 46 51 45 47 
                 C43 40 40 31 38 27 
                 C35 34 31 43 28 49 
                 C27 51 25 52 22 52 Z"
              fill="url(#logoRoseGradient)"
            />

            {/* Sparkle touch */}
            <path
              d="M56 14 L57 17 L60 18 L57 19 L56 22 L55 19 L52 18 L55 17 Z"
              fill="#D97A94"
              opacity="0.8"
            />
          </svg>
        </div>
      )}

      {/* Typography */}
      {showText && (
        <div className="leading-none min-w-0">
          <div className="flex items-center space-x-1.5">
            <span
              className={`font-extrabold tracking-[0.16em] text-stone-900 ${currentSize.text} uppercase font-sans`}
              style={{ letterSpacing: '0.12em' }}
            >
              MOON STORE
            </span>
          </div>
          {subtitle && (
            <p
              className={`text-[#C86D85] font-semibold tracking-[0.2em] uppercase mt-0.5 ${currentSize.sub}`}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

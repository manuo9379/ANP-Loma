import React from 'react';

export const AVATAR_MAP: Record<string, { emoji: string; bg: string; name: string }> = {
  lobo: { emoji: '🦭', bg: 'bg-gradient-to-br from-amber-400 to-orange-500', name: 'Lobo Marino' },
  pinguino: { emoji: '🐧', bg: 'bg-gradient-to-br from-cyan-400 to-blue-500', name: 'Pingüino' },
  ballena: { emoji: '🐋', bg: 'bg-gradient-to-br from-sky-400 to-indigo-600', name: 'Ballena Franca' },
  guanaco: { emoji: '🦌', bg: 'bg-gradient-to-br from-yellow-400 to-amber-600', name: 'Guanaco' },
  orca: { emoji: '🐳', bg: 'bg-gradient-to-br from-slate-600 to-slate-900', name: 'Orca' },
  choique: { emoji: '🐦', bg: 'bg-gradient-to-br from-emerald-400 to-teal-600', name: 'Choique' }
};

interface UserAvatarProps {
  avatar?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({ avatar, name, size = 'sm', className = '' }: UserAvatarProps) {
  const selected = avatar && AVATAR_MAP[avatar] ? AVATAR_MAP[avatar] : null;

  const sizeClasses = {
    sm: 'w-8 h-8 text-base shadow-sm',
    md: 'w-12 h-12 text-2xl shadow',
    lg: 'w-20 h-20 text-4xl shadow-md border-4 border-white dark:border-slate-800'
  };

  if (selected) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full ${selected.bg} text-white flex items-center justify-center select-none shrink-0 transition-transform hover:scale-105 ${className}`}
        title={selected.name}
      >
        <span className="leading-none">{selected.emoji}</span>
      </div>
    );
  }

  // Fallback
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-emerald-600 text-emerald-50 font-bold flex items-center justify-center uppercase shrink-0 select-none transition-transform hover:scale-105 ${className}`}
      style={{ fontSize: size === 'lg' ? '1.5rem' : size === 'md' ? '1.1rem' : '0.8rem' }}
    >
      {name ? name.slice(0, 2).toUpperCase() : 'OP'}
    </div>
  );
}

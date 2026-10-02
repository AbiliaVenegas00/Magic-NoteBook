import React, { useState, useRef, useEffect } from 'react';
import { User, LogIn, LogOut, CheckCircle2, Cloud, Sparkles } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleAuthButtonProps {
  user: FirebaseUser | null;
  loading: boolean;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  user,
  loading,
  onSignInWithGoogle,
  onSignOut,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-24 rounded-full bg-black/10 animate-pulse flex items-center justify-center text-[11px] text-[#5C464B] font-bold">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <button
        id="btn-google-login"
        onClick={() => onSignInWithGoogle()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold bg-[#1F1F1F] text-white hover:bg-[#333333] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm shrink-0"
        title="Iniciar sesión con Google"
      >
        {/* Google 'G' icon */}
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.8 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
          />
          <path
            fill="#FBBC05"
            d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.3-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"
          />
        </svg>
        <span className="truncate">Acceder</span>
      </button>
    );
  }

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 p-1 pr-2.5 rounded-full bg-[#1F1F1F] text-white hover:bg-[#333333] transition-all shadow-xs border border-[#5C464B]/30 active:scale-95"
        title={user.displayName || user.email || 'Mi cuenta'}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Avatar'}
            className="w-6 h-6 rounded-full object-cover ring-1 ring-[#FFD1DB]"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#FFD1DB] text-[#1F1F1F] flex items-center justify-center font-extrabold text-[11px]">
            {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
        )}
        <span className="text-[11px] font-extrabold max-w-[80px] sm:max-w-[110px] truncate leading-none">
          {user.displayName?.split(' ')[0] || 'Cuenta'}
        </span>
      </button>

      {/* Account Info Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-white">
          <div className="flex items-center gap-3 p-2 bg-[#252525] rounded-xl border border-[#5C464B]/40 mb-2.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FF688B]"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#FFD1DB] text-[#1F1F1F] flex items-center justify-center font-black text-sm">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold text-white truncate">
                {user.displayName || 'Usuario'}
              </div>
              <div className="text-[10px] text-[#E5A0B6] truncate">
                {user.email}
              </div>
            </div>
          </div>

          <div className="px-2 py-1.5 flex items-center gap-2 text-[11px] text-[#FFD1DB] mb-2 font-medium">
            <Cloud className="w-3.5 h-3.5 text-[#FF688B] shrink-0" />
            <span>Sincronización en la nube activa</span>
          </div>

          <button
            onClick={() => {
              setShowDropdown(false);
              onSignOut();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/05 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-bold transition-all border border-white/05 hover:border-rose-500/30 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
};

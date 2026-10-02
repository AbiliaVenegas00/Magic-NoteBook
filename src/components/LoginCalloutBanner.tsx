import React, { useState } from 'react';
import { Cloud, X, Sparkles } from 'lucide-react';

interface LoginCalloutBannerProps {
  onSignInWithGoogle: () => Promise<void>;
}

export const LoginCalloutBanner: React.FC<LoginCalloutBannerProps> = ({
  onSignInWithGoogle,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mb-4 bg-gradient-to-r from-[#2A2326] via-[#241F22] to-[#1F1F1F] border border-[#FF688B]/40 rounded-2xl p-3.5 sm:p-4 text-white shadow-md relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF688B]/20 border border-[#FF688B]/40 flex items-center justify-center shrink-0 text-[#FFD1DB]">
            <Cloud className="w-5 h-5 text-[#FF688B]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>Guarda y sincroniza tus planes con Google</span>
              <Sparkles className="w-3.5 h-3.5 text-[#FFD1DB]" />
            </h4>
            <p className="text-[11px] text-[#E5A0B6] mt-0.5 font-medium leading-relaxed">
              Inicia sesión para sincronizar automáticamente tu calendario, metas y notas en la nube desde cualquier dispositivo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => onSignInWithGoogle()}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#FFD1DB] hover:bg-white text-[#1F1F1F] font-extrabold text-xs rounded-full transition-all shadow-sm active:scale-95"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
            <span>Acceder con Google</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full text-[#E5A0B6]/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Descartar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

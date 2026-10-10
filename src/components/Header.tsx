import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Columns3, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Check,
  Plus, 
  Download, 
  Upload, 
  Trash2,
  Target,
  StickyNote,
  Menu,
  X,
  User as UserIcon
} from 'lucide-react';
import { CalendarViewMode, MainViewSection } from '../types';
import { formatMonthYear, formatHumanDate, formatDateToISO } from '../utils/dateUtils';
import { GoogleAuthButton } from './GoogleAuthButton';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  currentDate: Date;
  onNavigateDate: (direction: 'prev' | 'next' | 'today') => void;
  viewMode: CalendarViewMode;
  onChangeViewMode: (mode: CalendarViewMode) => void;
  mainSection: MainViewSection;
  onChangeMainSection: (section: MainViewSection) => void;
  onOpenCreateTask: () => void;
  onOpenCreateGoal: () => void;
  onExportData: () => void;
  onImportData: () => void;
  onClearAllData: () => void;
  user: FirebaseUser | null;
  authLoading: boolean;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onNavigateDate,
  viewMode,
  onChangeViewMode,
  mainSection,
  onChangeMainSection,
  onOpenCreateTask,
  onOpenCreateGoal,
  onExportData,
  onImportData,
  onClearAllData,
  user,
  authLoading,
  onSignInWithGoogle,
  onSignOut,
}) => {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setShowViewMenu(false);
      }
      // If clicking outside header, close mobile menu
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return formatMonthYear(currentDate);
    }
    if (viewMode === 'day') {
      return formatHumanDate(formatDateToISO(currentDate));
    }
    if (viewMode === 'week') {
      const year = currentDate.getFullYear();
      const monthName = currentDate.toLocaleDateString('es-ES', { month: 'short' });
      return `${monthName} ${year}`;
    }
    if (viewMode === 'board') return 'Tablero';
    return formatMonthYear(currentDate);
  };

  return (
    <header 
      ref={headerRef}
      className="sticky top-0 z-30 transition-all duration-300 relative bg-[#FFD1DB] border-b border-[#E5A0B6] text-[#1F1F1F] shadow-[0_2px_15px_rgba(0,0,0,0.15)]" 
      id="app-header"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        
        {/* DESKTOP LAYOUT (Visible on lg and larger screens) */}
        <div className="hidden lg:flex items-center justify-between gap-3">
          
          {/* Left: Brand Identity & Date Navigator */}
          <div className="flex items-center gap-3">
            {/* Clickable Brand Badge with View Switcher Dropdown */}
            <div className="relative" ref={viewMenuRef}>
              <button
                id="btn-views-dropdown-trigger"
                onClick={() => setShowViewMenu(!showViewMenu)}
                className="flex items-center gap-2.5 p-1 rounded-2xl transition-all duration-200 select-none group hover:bg-[#1F1F1F]/08 active:scale-95 text-left"
                title="Cambiar vista"
                aria-haspopup="true"
                aria-expanded={showViewMenu}
              >
                <div className="w-8 h-8 rounded-xl bg-[#1F1F1F] text-[#FFD1DB] flex items-center justify-center transition-all duration-200 shadow-sm group-hover:scale-105 shrink-0">
                  {mainSection === 'calendar' ? (
                    <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
                  ) : mainSection === 'goals' ? (
                    <Target className="w-4 h-4 stroke-[2.2]" />
                  ) : (
                    <StickyNote className="w-4 h-4 stroke-[2.2]" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 pr-1">
                  <span className="text-[13px] font-extrabold tracking-tight block leading-tight text-[#1F1F1F]">
                    {mainSection === 'calendar' 
                      ? 'Calendario de Planes' 
                      : mainSection === 'goals' 
                      ? 'Tareas por Meta' 
                      : 'Notas Rápidas'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-[#5C464B] ${
                    showViewMenu ? 'rotate-180' : ''
                  }`} />
                </div>
              </button>

              {/* Dropdown Menu with the 3 Available Views */}
              {showViewMenu && (
                <div 
                  className="absolute left-0 top-full mt-2 w-52 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#FF688B] mb-1">
                    Vistas disponibles
                  </div>

                  <button
                    id="menu-opt-view-calendar"
                    onClick={() => {
                      onChangeMainSection('calendar');
                      setShowViewMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      mainSection === 'calendar'
                        ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Calendario</span>
                    </div>
                    {mainSection === 'calendar' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <button
                    id="menu-opt-view-tasks"
                    onClick={() => {
                      onChangeMainSection('goals');
                      setShowViewMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all mt-1 ${
                      mainSection === 'goals'
                        ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Target className="w-4 h-4" />
                      <span>Tareas por Meta</span>
                    </div>
                    {mainSection === 'goals' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <button
                    id="menu-opt-view-notes"
                    onClick={() => {
                      onChangeMainSection('notes');
                      setShowViewMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all mt-1 ${
                      mainSection === 'notes'
                        ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <StickyNote className="w-4 h-4" />
                      <span>Notas Rápidas</span>
                    </div>
                    {mainSection === 'notes' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                </div>
              )}
            </div>

            {/* Date Navigator Pill (Desktop) - only shown when in calendar and not in month view */}
            {mainSection === 'calendar' && viewMode !== 'month' && (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-nav-prev"
                  onClick={() => onNavigateDate('prev')}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#1F1F1F] hover:bg-black/10 transition-all active:scale-95"
                  title="Periodo anterior"
                  aria-label="Periodo anterior"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                </button>

                <button
                  id="btn-nav-today"
                  onClick={() => onNavigateDate('today')}
                  className="px-3.5 py-1 text-xs font-extrabold rounded-full bg-[#1F1F1F] text-white hover:bg-[#333333] transition-all shadow-xs active:scale-95"
                >
                  Hoy
                </button>

                <button
                  id="btn-nav-next"
                  onClick={() => onNavigateDate('next')}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#1F1F1F] hover:bg-black/10 transition-all active:scale-95"
                  title="Periodo siguiente"
                  aria-label="Periodo siguiente"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#FFD1DB] border border-[#5C464B]/35 text-[#1F1F1F] capitalize tracking-tight min-w-[120px] text-center shadow-xs">
                  {getHeaderTitle()}
                </span>
              </div>
            )}
          </div>

          {/* Right: View Mode Tabs, Primary Actions & Google Auth */}
          <div className="flex items-center gap-2.5">
            {/* View Mode Segmented Controls */}
            {mainSection === 'calendar' && (
              <nav 
                aria-label="Modos de vista del calendario" 
                className="flex items-center gap-1 p-0.5 rounded-full"
              >
                <button
                  id="tab-view-month"
                  onClick={() => onChangeViewMode('month')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all text-xs ${
                    viewMode === 'month'
                      ? 'bg-[#1F1F1F] text-white shadow-xs'
                      : 'text-[#5C464B] hover:text-[#1F1F1F] hover:bg-black/5 font-semibold'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Mes</span>
                </button>

                <button
                  id="tab-view-week"
                  onClick={() => onChangeViewMode('week')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all text-xs ${
                    viewMode === 'week'
                      ? 'bg-[#1F1F1F] text-white shadow-xs'
                      : 'text-[#5C464B] hover:text-[#1F1F1F] hover:bg-black/5 font-semibold'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Semana</span>
                </button>

                <button
                  id="tab-view-day"
                  onClick={() => onChangeViewMode('day')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all text-xs ${
                    viewMode === 'day'
                      ? 'bg-[#1F1F1F] text-white shadow-xs'
                      : 'text-[#5C464B] hover:text-[#1F1F1F] hover:bg-black/5 font-semibold'
                  }`}
                >
                  <span>Día</span>
                </button>

                <button
                  id="tab-view-board"
                  onClick={() => onChangeViewMode('board')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all text-xs ${
                    viewMode === 'board'
                      ? 'bg-[#1F1F1F] text-white shadow-xs'
                      : 'text-[#5C464B] hover:text-[#1F1F1F] hover:bg-black/5 font-semibold'
                  }`}
                >
                  <Columns3 className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Tablero</span>
                </button>
              </nav>
            )}

            {/* Primary Action Button */}
            {mainSection === 'calendar' ? (
              <button
                id="btn-create-task"
                onClick={onOpenCreateTask}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold bg-[#1F1F1F] text-white hover:bg-[#333333] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Nuevo</span>
              </button>
            ) : mainSection === 'goals' ? (
              <button
                id="btn-create-goal"
                onClick={onOpenCreateGoal}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold bg-[#1F1F1F] text-white hover:bg-[#333333] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Nueva Meta</span>
              </button>
            ) : null}

            {/* Google Authentication Button / User Profile */}
            <GoogleAuthButton 
              user={user} 
              loading={authLoading} 
              onSignInWithGoogle={onSignInWithGoogle} 
              onSignOut={onSignOut} 
            />

            {/* Options Dropdown */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                id="btn-settings-menu"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#1F1F1F] hover:bg-black/10 transition-all border border-[#5C464B]/30 active:scale-95"
                title="Opciones y descargas"
                aria-label="Opciones y descargas"
              >
                <Download className="w-4 h-4 stroke-[2]" />
              </button>

              {showSettingsMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-2.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-150 text-white">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold text-[#FF688B] uppercase tracking-wider mb-1">
                    Gestión de datos
                  </div>

                  <button
                    onClick={() => {
                      onExportData();
                      setShowSettingsMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 text-white/90 hover:text-white transition-all text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5 text-[#FF688B]" />
                    <span>Exportar copia JSON</span>
                  </button>

                  <button
                    onClick={() => {
                      onImportData();
                      setShowSettingsMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 text-white/90 hover:text-white transition-all text-xs font-medium"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#FFD1DB]" />
                    <span>Importar copia JSON</span>
                  </button>

                  <div className="h-[1px] bg-white/10 my-1" />

                  <button
                    onClick={() => {
                      if (confirm('¿Restablecer y borrar todos los datos locales?')) {
                        onClearAllData();
                        setShowSettingsMenu(false);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-rose-500/20 text-rose-300 transition-all text-xs font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Restablecer todo</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* MOBILE TOP BAR (Visible only on mobile screens < lg) */}
        <div className="flex lg:hidden items-center justify-between gap-2">
          {/* Brand & Section Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#1F1F1F] text-[#FFD1DB] flex items-center justify-center shadow-xs shrink-0">
              {mainSection === 'calendar' ? (
                <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
              ) : mainSection === 'goals' ? (
                <Target className="w-4 h-4 stroke-[2.2]" />
              ) : (
                <StickyNote className="w-4 h-4 stroke-[2.2]" />
              )}
            </div>
            <span className="text-sm font-extrabold tracking-tight text-[#1F1F1F] truncate">
              {mainSection === 'calendar' 
                ? 'Calendario' 
                : mainSection === 'goals' 
                ? 'Tareas por Meta' 
                : 'Notas Rápidas'}
            </span>
          </div>

          {/* Quick Action + Google Login + Hamburger Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Google Login on Mobile */}
            <GoogleAuthButton 
              user={user} 
              loading={authLoading} 
              onSignInWithGoogle={onSignInWithGoogle} 
              onSignOut={onSignOut} 
            />

            {/* Quick Action Button */}
            {mainSection === 'calendar' ? (
              <button
                id="btn-mobile-quick-task"
                onClick={onOpenCreateTask}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold bg-[#1F1F1F] text-white hover:bg-[#333333] transition-all shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Nuevo</span>
              </button>
            ) : mainSection === 'goals' ? (
              <button
                id="btn-mobile-quick-goal"
                onClick={onOpenCreateGoal}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold bg-[#1F1F1F] text-white hover:bg-[#333333] transition-all shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Meta</span>
              </button>
            ) : null}

            {/* Hamburger Button that houses all menus for mobile */}
            <button
              id="btn-mobile-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-8 h-8 rounded-xl bg-[#1F1F1F] text-[#FFD1DB] hover:bg-[#333333] flex items-center justify-center transition-all active:scale-95 shadow-xs"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Menu className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE COMPACT CALENDAR DATE SUB-BAR (visible when in calendar and menu is closed, but hidden in month view since MonthView has its own controls) */}
        {mainSection === 'calendar' && viewMode !== 'month' && !mobileMenuOpen && (
          <div className="flex lg:hidden items-center justify-between pt-2 mt-1.5 border-t border-[#E5A0B6]/60">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigateDate('prev')}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#1F1F1F] hover:bg-black/10 active:scale-95 transition-all"
                title="Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                onClick={() => onNavigateDate('today')}
                className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-[#1F1F1F] text-white active:scale-95 shadow-xs"
              >
                Hoy
              </button>
              <button
                onClick={() => onNavigateDate('next')}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#1F1F1F] hover:bg-black/10 active:scale-95 transition-all"
                title="Siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span className="text-[11px] font-extrabold text-[#1F1F1F] capitalize px-1 truncate max-w-[130px]">
                {getHeaderTitle()}
              </span>
            </div>

            {/* Quick Mode Indicator / Switcher Trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1F1F1F]/10 border border-[#5C464B]/30 text-[#1F1F1F] capitalize flex items-center gap-1 active:scale-95"
            >
              <span>{viewMode === 'month' ? 'Mes' : viewMode === 'week' ? 'Semana' : viewMode === 'day' ? 'Día' : 'Tablero'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        )}

      </div>

      {/* MOBILE HAMBURGER MENU DRAWER */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden bg-[#1F1F1F] border-t border-[#5C464B]/60 px-4 py-4 space-y-4 shadow-2xl text-white animate-in slide-in-from-top-2 duration-200"
          id="mobile-drawer-menu"
        >
          {/* User Account Card in Mobile Drawer */}
          {user ? (
            <div className="p-3 bg-[#252525] rounded-2xl border border-[#5C464B]/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full ring-2 ring-[#FF688B]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#FFD1DB] text-[#1F1F1F] font-black flex items-center justify-center text-xs">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{user.displayName || 'Usuario'}</div>
                  <div className="text-[10px] text-[#E5A0B6] truncate">{user.email}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  onSignOut();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-lg shrink-0"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onSignInWithGoogle();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FFD1DB] text-[#1F1F1F] font-extrabold rounded-xl text-xs shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          )}

          {/* Section 1: Cambiar Sección Principal */}
          <div>
            <div className="text-[10px] font-extrabold text-[#FF688B] uppercase tracking-wider mb-2">
              Sección de la aplicación
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => {
                  onChangeMainSection('calendar');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                  mainSection === 'calendar'
                    ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-sm'
                    : 'bg-[#252525] text-white/80 hover:bg-[#2b2b2b]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Calendario de Planes</span>
                </div>
                {mainSection === 'calendar' && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              <button
                onClick={() => {
                  onChangeMainSection('goals');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                  mainSection === 'goals'
                    ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-sm'
                    : 'bg-[#252525] text-white/80 hover:bg-[#2b2b2b]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4" />
                  <span>Tareas por Meta</span>
                </div>
                {mainSection === 'goals' && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              <button
                onClick={() => {
                  onChangeMainSection('notes');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                  mainSection === 'notes'
                    ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-sm'
                    : 'bg-[#252525] text-white/80 hover:bg-[#2b2b2b]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <StickyNote className="w-4 h-4" />
                  <span>Notas Rápidas</span>
                </div>
                {mainSection === 'notes' && <Check className="w-4 h-4 stroke-[3]" />}
              </button>
            </div>
          </div>

          {/* Section 2: Modos de Vista del Calendario */}
          {mainSection === 'calendar' && (
            <div>
              <div className="text-[10px] font-extrabold text-[#E5A0B6] uppercase tracking-wider mb-2">
                Vista del Calendario
              </div>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#252525] border border-[#5C464B]/40 rounded-xl">
                <button
                  onClick={() => {
                    onChangeViewMode('month');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'month'
                      ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-xs'
                      : 'text-[#E5A0B6] hover:text-white'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => {
                    onChangeViewMode('week');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'week'
                      ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-xs'
                      : 'text-[#E5A0B6] hover:text-white'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => {
                    onChangeViewMode('day');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'day'
                      ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-xs'
                      : 'text-[#E5A0B6] hover:text-white'
                  }`}
                >
                  Día
                </button>
                <button
                  onClick={() => {
                    onChangeViewMode('board');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'board'
                      ? 'bg-[#FFD1DB] text-[#1F1F1F] shadow-xs'
                      : 'text-[#E5A0B6] hover:text-white'
                  }`}
                >
                  Tablero
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Navegación de Fecha en Menú Móvil */}
          {mainSection === 'calendar' && (
            <div>
              <div className="text-[10px] font-extrabold text-[#E5A0B6] uppercase tracking-wider mb-2">
                Navegación de fecha
              </div>
              <div className="flex items-center justify-between p-2 bg-[#252525] border border-[#5C464B]/40 rounded-xl">
                <button
                  onClick={() => onNavigateDate('prev')}
                  className="px-3 py-1.5 text-xs font-bold bg-[#1F1F1F] rounded-lg hover:bg-[#333333] transition-all"
                >
                  ◀ Anterior
                </button>
                <button
                  onClick={() => {
                    onNavigateDate('today');
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs font-extrabold bg-[#FF688B] text-white rounded-lg hover:bg-[#ff7a9b] transition-all"
                >
                  Hoy
                </button>
                <button
                  onClick={() => onNavigateDate('next')}
                  className="px-3 py-1.5 text-xs font-bold bg-[#1F1F1F] rounded-lg hover:bg-[#333333] transition-all"
                >
                  Siguiente ▶
                </button>
              </div>
            </div>
          )}

          {/* Section 4: Acción Crear */}
          <div className="pt-1">
            {mainSection === 'calendar' ? (
              <button
                onClick={() => {
                  onOpenCreateTask();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FF688B] hover:bg-[#ff7a9b] text-white font-extrabold rounded-xl shadow-md text-xs active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nuevo Plan</span>
              </button>
            ) : mainSection === 'goals' ? (
              <button
                onClick={() => {
                  onOpenCreateGoal();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FF688B] hover:bg-[#ff7a9b] text-white font-extrabold rounded-xl shadow-md text-xs active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nueva Meta</span>
              </button>
            ) : null}
          </div>

          {/* Section 5: Opciones y Gestión de Datos */}
          <div className="pt-2 border-t border-[#5C464B]/40 space-y-1">
            <div className="text-[10px] font-extrabold text-[#5C464B] uppercase tracking-wider mb-1">
              Opciones y datos
            </div>
            <button
              onClick={() => {
                onExportData();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs hover:bg-[#252525] text-white/80 transition-all font-medium"
            >
              <Download className="w-3.5 h-3.5 text-[#FF688B]" />
              <span>Exportar copia JSON</span>
            </button>
            <button
              onClick={() => {
                onImportData();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs hover:bg-[#252525] text-white/80 transition-all font-medium"
            >
              <Upload className="w-3.5 h-3.5 text-[#FFD1DB]" />
              <span>Importar copia JSON</span>
            </button>
            <button
              onClick={() => {
                if (confirm('¿Restablecer y borrar todos los datos locales?')) {
                  onClearAllData();
                  setMobileMenuOpen(false);
                }
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs hover:bg-rose-500/20 text-rose-300 transition-all font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Restablecer todo</span>
            </button>
          </div>
        </div>
      )}

    </header>
  );
};

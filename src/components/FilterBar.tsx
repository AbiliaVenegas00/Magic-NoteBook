import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { FilterOptions } from '../types';
import { STATUS_CONFIG, CALENDAR_PRIORITIES, PRIORITY_CONFIG } from '../utils/themeHelpers';

interface FilterBarProps {
  filters: FilterOptions;
  onChangeFilters: (updated: Partial<FilterOptions>) => void;
  onResetFilters: () => void;
  stats?: {
    total: number;
    active: number;
    dueToday: number;
    overdue: number;
    completed: number;
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilters,
  onResetFilters,
}) => {
  const isAnyFilterActive =
    filters.search !== '' ||
    filters.priority !== 'all' ||
    filters.status !== 'all';

  return (
    <div className="bg-[#1F1F1F] border-b border-[#5C464B]/40 px-3 sm:px-6 py-2.5 relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Search & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          
          {/* White search bar matching the theme mockup */}
          <div className="relative min-w-[200px] max-w-xs flex-1 group">
            <Search className="w-3.5 h-3.5 text-[#5C464B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
            <input
              id="input-search-tasks"
              type="text"
              placeholder="Buscar planes o notas..."
              value={filters.search}
              onChange={(e) => onChangeFilters({ search: e.target.value })}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white text-[#1F1F1F] placeholder-[#5C464B]/70 rounded-full focus:outline-hidden focus:ring-2 focus:ring-[#FF688B] border border-transparent transition-all font-semibold shadow-xs"
            />
            {filters.search && (
              <button
                onClick={() => onChangeFilters({ search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5C464B] hover:text-[#1F1F1F] p-1 rounded-full hover:bg-black/10 transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              id="select-filter-priority"
              value={filters.priority}
              onChange={(e) => onChangeFilters({ priority: e.target.value as any })}
              className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#FF688B] transition-all cursor-pointer ${
                filters.priority !== 'all'
                  ? 'border border-[#FF688B] bg-[#3D2C30] text-[#FFD1DB] shadow-xs'
                  : 'bg-[#3D2C30] hover:bg-[#4E393E] border border-[#5C464B] text-[#FFD1DB]/90 hover:text-white'
              }`}
            >
              <option value="all" className="bg-[#1F1F1F] text-white">Todas las prioridades</option>
              {CALENDAR_PRIORITIES.map((pKey) => {
                const cfg = PRIORITY_CONFIG[pKey];
                return (
                  <option key={pKey} value={pKey} className="bg-[#1F1F1F] text-white">
                    {cfg.label}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3 h-3 text-[#FFD1DB]/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              id="select-filter-status"
              value={filters.status}
              onChange={(e) => onChangeFilters({ status: e.target.value as any })}
              className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#FF688B] transition-all cursor-pointer ${
                filters.status !== 'all'
                  ? 'border border-[#FF688B] bg-[#3D2C30] text-[#FFD1DB] shadow-xs'
                  : 'bg-[#3D2C30] hover:bg-[#4E393E] border border-[#5C464B] text-[#FFD1DB]/90 hover:text-white'
              }`}
            >
              <option value="all" className="bg-[#1F1F1F] text-white">Todos los estados</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key} className="bg-[#1F1F1F] text-white">
                  {cfg.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#FFD1DB]/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {isAnyFilterActive && (
            <button
              id="btn-reset-filters"
              onClick={onResetFilters}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full text-[#FF688B] hover:text-white bg-[#3D2C30] border border-[#FF688B]/40 transition-all font-semibold active:scale-95 shadow-xs"
            >
              <X className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

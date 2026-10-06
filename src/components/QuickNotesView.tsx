import React, { useState, useMemo, useRef } from 'react';
import { 
  StickyNote, 
  Plus, 
  Pin, 
  Trash2, 
  Search, 
  Edit3, 
  Copy, 
  Check, 
  X,
  Palette,
  Highlighter,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  CheckSquare,
  Eye,
  FileCode,
  Maximize2,
  Minimize2,
  RotateCcw
} from 'lucide-react';
import { QuickNote } from '../types';

interface QuickNotesViewProps {
  notes: QuickNote[];
  onAddNote: (note: Omit<QuickNote, 'id' | 'createdAt'>) => void;
  onUpdateNote: (noteId: string, updated: Partial<QuickNote>) => void;
  onDeleteNote: (noteId: string) => void;
}

const NOTE_COLORS = [
  { hex: '#FF99AA', label: 'Rosa Cálido' },
  { hex: '#EAB308', label: 'Amarillo' },
  { hex: '#10B981', label: 'Verde Esmeralda' },
  { hex: '#FF6688', label: 'Coral' },
  { hex: '#06B6D4', label: 'Cian' },
  { hex: '#A855F7', label: 'Púrpura' },
  { hex: '#3B82F6', label: 'Azul' },
];

/**
 * Applies Markdown/custom styling wrappers to the current textarea selection.
 */
function insertFormatting(
  textarea: HTMLTextAreaElement | null,
  prefix: string,
  suffix: string,
  placeholder: string,
  currentValue: string,
  setValue: (val: string) => void
) {
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = currentValue.slice(start, end);
  const textToInsert = selected || placeholder;
  const nextValue = currentValue.slice(0, start) + prefix + textToInsert + suffix + currentValue.slice(end);

  setValue(nextValue);

  setTimeout(() => {
    textarea.focus();
    if (selected) {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    } else {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
    }
  }, 0);
}

function insertLinePrefix(
  textarea: HTMLTextAreaElement | null,
  linePrefix: string,
  currentValue: string,
  setValue: (val: string) => void
) {
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = currentValue.slice(0, start);
  const lastNewline = before.lastIndexOf('\n');
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

  const nextValue = currentValue.slice(0, lineStart) + linePrefix + currentValue.slice(lineStart);
  setValue(nextValue);

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + linePrefix.length, end + linePrefix.length);
  }, 0);
}

/**
 * Rich Formatted Content Renderer for Note Cards and Previews
 */
interface FormattedNoteProps {
  content: string;
  onToggleCheckbox?: (lineIndex: number, currentChecked: boolean) => void;
  interactiveCheckboxes?: boolean;
}

const FormattedNoteContent: React.FC<FormattedNoteProps> = ({
  content,
  onToggleCheckbox,
  interactiveCheckboxes = false,
}) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {lines.map((line, idx) => {
        // Checklist line: - [ ] or - [x] or [ ] or [x]
        const checkboxMatch = line.match(/^(\s*[-*]?\s*)\[([ xX])\]\s*(.*)$/);
        if (checkboxMatch) {
          const isChecked = checkboxMatch[2].toLowerCase() === 'x';
          const taskText = checkboxMatch[3];

          return (
            <div key={idx} className="flex items-start gap-2 group/check my-0.5">
              <button
                type="button"
                disabled={!interactiveCheckboxes}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleCheckbox) onToggleCheckbox(idx, isChecked);
                }}
                className={`w-3.5 h-3.5 mt-0.5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                  isChecked
                    ? 'bg-[#FF99AA] border-[#FFB0CC] text-[#0F0F1A]'
                    : 'border-white/30 hover:border-[#FF99AA] bg-black/40 hover:bg-black/60'
                } ${interactiveCheckboxes ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>
              <div className={`flex-1 min-w-0 ${isChecked ? 'line-through text-white/40' : 'text-[#FFE8EF]'}`}>
                <RenderInlineFormatting text={taskText} />
              </div>
            </div>
          );
        }

        // Bullet item line: - or * or •
        const bulletMatch = line.match(/^(\s*)[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF99AA] shrink-0 mt-1.5 shadow-xs" />
              <div className="flex-1 min-w-0">
                <RenderInlineFormatting text={bulletMatch[2]} />
              </div>
            </div>
          );
        }

        // Quote / Callout line: >
        const quoteMatch = line.match(/^>\s*(.*)$/);
        if (quoteMatch) {
          return (
            <div key={idx} className="border-l-2 border-[#FF99AA] pl-2.5 py-0.5 my-1 text-[#FFE8EF]/90 italic bg-white/[0.02] rounded-r-lg">
              <RenderInlineFormatting text={quoteMatch[1]} />
            </div>
          );
        }

        // Empty line
        if (!line.trim()) {
          return <div key={idx} className="h-2" />;
        }

        // Regular line
        return (
          <div key={idx} className="break-words">
            <RenderInlineFormatting text={line} />
          </div>
        );
      })}
    </div>
  );
};

/**
 * Parses inline formatting tags:
 * - Highlight: ==text== or ==rose:text== or ==green:text==
 * - Bold: **text**
 * - Italic: *text*
 * - Underline: <u>text</u> or __text__
 * - Strikethrough: ~~text~~
 */
const RenderInlineFormatting: React.FC<{ text: string }> = ({ text }) => {
  // Regex tokenizing all supported inline tags
  const tokens = useMemo(() => {
    const regex = /(==(?:rose:|green:)?[\s\S]+?==|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|<u>[\s\S]+?<\/u>|__[\s\S]+?__|~~[\s\S]+?~~)/g;
    const parts: { type: string; content: string; extra?: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }

      const raw = match[0];
      if (raw.startsWith('==') && raw.endsWith('==')) {
        const inner = raw.slice(2, -2);
        if (inner.startsWith('rose:')) {
          parts.push({ type: 'highlight_rose', content: inner.slice(5) });
        } else if (inner.startsWith('green:')) {
          parts.push({ type: 'highlight_green', content: inner.slice(6) });
        } else {
          parts.push({ type: 'highlight', content: inner });
        }
      } else if (raw.startsWith('**') && raw.endsWith('**')) {
        parts.push({ type: 'bold', content: raw.slice(2, -2) });
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        parts.push({ type: 'italic', content: raw.slice(1, -1) });
      } else if (raw.startsWith('<u>') && raw.endsWith('</u>')) {
        parts.push({ type: 'underline', content: raw.slice(3, -4) });
      } else if (raw.startsWith('__') && raw.endsWith('__')) {
        parts.push({ type: 'underline', content: raw.slice(2, -2) });
      } else if (raw.startsWith('~~') && raw.endsWith('~~')) {
        parts.push({ type: 'strike', content: raw.slice(2, -2) });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return parts;
  }, [text]);

  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'highlight':
            // Glowing vibrant yellow highlighter
            return (
              <mark 
                key={i} 
                className="bg-amber-400/25 text-amber-200 px-1 py-0.2 rounded font-semibold border-b border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.15)]"
              >
                {token.content}
              </mark>
            );
          case 'highlight_rose':
            // Glowing warm rose highlighter
            return (
              <mark 
                key={i} 
                className="bg-[#FF6688]/30 text-[#FFE8EF] px-1 py-0.2 rounded font-semibold border-b border-[#FF6688]/70 shadow-[0_0_8px_rgba(255,102,136,0.2)]"
              >
                {token.content}
              </mark>
            );
          case 'highlight_green':
            // Glowing emerald highlighter
            return (
              <mark 
                key={i} 
                className="bg-emerald-500/25 text-emerald-200 px-1 py-0.2 rounded font-semibold border-b border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
              >
                {token.content}
              </mark>
            );
          case 'bold':
            return <strong key={i} className="font-extrabold text-white">{token.content}</strong>;
          case 'italic':
            return <em key={i} className="italic text-white/95">{token.content}</em>;
          case 'underline':
            return (
              <span key={i} className="underline underline-offset-3 decoration-[#FF99AA] decoration-2">
                {token.content}
              </span>
            );
          case 'strike':
            return <span key={i} className="line-through opacity-60">{token.content}</span>;
          default:
            return <span key={i}>{token.content}</span>;
        }
      })}
    </>
  );
};

export const QuickNotesView: React.FC<QuickNotesViewProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  // New Note composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'write' | 'preview'>('write');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState(NOTE_COLORS[0].hex);
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [isComposerMaximized, setIsComposerMaximized] = useState(false);

  // Dynamic box size for note composer (persists in localStorage so user's desired size is remembered)
  const [composerSize, setComposerSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('minimal_plan_note_composer_size');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          return {
            width: Math.max(380, Math.min(1500, parsed.width)),
            height: Math.max(360, Math.min(1050, parsed.height)),
          };
        }
      }
    } catch {
      // ignore
    }
    return { width: 680, height: 560 };
  });

  // Dynamic box size for edit modal
  const [editModalSize, setEditModalSize] = useState<{ width: number; height: number }>({
    width: 680,
    height: 560,
  });

  const composerBoxRef = useRef<HTMLDivElement>(null);
  const editBoxRef = useRef<HTMLDivElement>(null);
  const [isResizingBox, setIsResizingBox] = useState(false);
  const isResizingBoxRef = useRef(false);
  const justResizedRef = useRef(false);
  const mouseDownBackdropRef = useRef<EventTarget | null>(null);

  const startResize = (
    e: React.MouseEvent,
    direction: 'both' | 'horizontal' | 'vertical',
    isEditing: boolean = false
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const boxEl = isEditing ? editBoxRef.current : composerBoxRef.current;
    if (!boxEl) return;

    isResizingBoxRef.current = true;
    justResizedRef.current = true;
    setIsResizingBox(true);

    const rect = boxEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const maxWidth = Math.min(window.innerWidth * 0.96, 1500);
      const maxHeight = Math.min(window.innerHeight * 0.94, 1100);

      if (isEditing) {
        setEditModalSize((prev) => {
          let nextW = prev.width;
          let nextH = prev.height;

          if (direction === 'both' || direction === 'horizontal') {
            const w = Math.round((moveEvent.clientX - centerX) * 2);
            nextW = Math.max(380, Math.min(maxWidth, w));
          }
          if (direction === 'both' || direction === 'vertical') {
            const h = Math.round((moveEvent.clientY - centerY) * 2);
            nextH = Math.max(360, Math.min(maxHeight, h));
          }
          return { width: nextW, height: nextH };
        });
      } else {
        setComposerSize((prev) => {
          let nextW = prev.width;
          let nextH = prev.height;

          if (direction === 'both' || direction === 'horizontal') {
            const w = Math.round((moveEvent.clientX - centerX) * 2);
            nextW = Math.max(380, Math.min(maxWidth, w));
          }
          if (direction === 'both' || direction === 'vertical') {
            const h = Math.round((moveEvent.clientY - centerY) * 2);
            nextH = Math.max(360, Math.min(maxHeight, h));
          }
          const updated = { width: nextW, height: nextH };
          try {
            localStorage.setItem('minimal_plan_note_composer_size', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }
    };

    const onClickCapture = (clickEvent: MouseEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      window.removeEventListener('click', onClickCapture, true);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      upEvent.stopPropagation();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp, true);

      // Swallow any click event that fires right after mouse release
      window.addEventListener('click', onClickCapture, true);
      setTimeout(() => {
        window.removeEventListener('click', onClickCapture, true);
      }, 350);

      isResizingBoxRef.current = false;
      setIsResizingBox(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      justResizedRef.current = true;
      setTimeout(() => {
        justResizedRef.current = false;
      }, 400);
    };

    document.body.style.userSelect = 'none';
    if (direction === 'both') {
      document.body.style.cursor = 'nwse-resize';
    } else if (direction === 'horizontal') {
      document.body.style.cursor = 'ew-resize';
    } else {
      document.body.style.cursor = 'ns-resize';
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, true);
  };

  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
  const [editMode, setEditMode] = useState<'write' | 'preview'>('write');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [isEditMaximized, setIsEditMaximized] = useState(false);

  // Copy feedback state (map noteId -> boolean)
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [noteToDelete, setNoteToDelete] = useState<QuickNote | null>(null);

  const handleCreateNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    onAddNote({
      title: newTitle.trim(),
      content: newContent.trim(),
      color: newColor,
      isPinned: newIsPinned,
    });

    setNewTitle('');
    setNewContent('');
    setNewColor(NOTE_COLORS[0].hex);
    setNewIsPinned(false);
    setIsComposerOpen(false);
    setComposerMode('write');
  };

  const handleOpenEdit = (note: QuickNote) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color || NOTE_COLORS[0].hex);
    setEditIsPinned(!!note.isPinned);
    setEditMode('write');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    onUpdateNote(editingNote.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
      color: editColor,
      isPinned: editIsPinned,
      updatedAt: new Date().toISOString(),
    });

    setEditingNote(null);
  };

  const handleCopyNote = (note: QuickNote) => {
    const textToCopy = note.title 
      ? `${note.title}\n\n${note.content}` 
      : note.content;
    navigator.clipboard.writeText(textToCopy);
    setCopiedNoteId(note.id);
    setTimeout(() => {
      setCopiedNoteId(null);
    }, 2000);
  };

  // Toggle checklist checkbox directly inside a note
  const handleToggleNoteCheckbox = (note: QuickNote, lineIndex: number, currentChecked: boolean) => {
    const lines = note.content.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const line = lines[lineIndex];
    const newBox = currentChecked ? '[ ]' : '[x]';
    const updatedLine = line.replace(/\[([ xX])\]/, newBox);
    lines[lineIndex] = updatedLine;

    onUpdateNote(note.id, {
      content: lines.join('\n'),
      updatedAt: new Date().toISOString(),
    });
  };

  // Filtered notes
  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [notes, searchQuery]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  return (
    <div className="space-y-6" id="quick-notes-view">
      
      {/* Top Banner & Search Header */}
      <div className="relative bg-[#1F1F1F] border border-[#5C464B]/60 rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#3D2C30] border border-[#5C464B] text-[#FFD1DB] shadow-xs shrink-0">
              <StickyNote className="w-4 h-4 stroke-[2.5]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Notas Rápidas
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#3D2C30] text-[#FFD1DB] border border-[#5C464B] rounded-full">
                  {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input matching white search bar */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#5C464B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en notas..."
                className="w-full pl-9 pr-7 py-1.5 bg-white text-[#1F1F1F] placeholder-[#5C464B]/70 rounded-full text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#FF688B] border border-transparent shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#5C464B] hover:text-[#1F1F1F]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsComposerOpen(true)}
              className="px-4 py-1.5 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white rounded-full transition-all shadow-md shadow-[#FF688B]/30 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Nueva Nota</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="relative bg-[#252525] border border-[#5C464B]/50 rounded-3xl p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-[#3D2C30] border border-[#5C464B] flex items-center justify-center mb-3 text-[#FFD1DB]">
            <StickyNote className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            {searchQuery ? 'No se encontraron notas con esa búsqueda' : 'No hay notas rápidas todavía'}
          </h3>
          <p className="text-xs text-white/50 mb-4">
            {searchQuery ? 'Intenta buscar con otra palabra.' : 'Guarda ideas, notas remarcadas, checklists o lo que necesites tener a mano.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsComposerOpen(true)}
              className="px-5 py-2 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white rounded-full transition-all shadow-md shadow-[#FF688B]/30 flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Escribir primera nota</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-[11px] font-bold text-white/50 uppercase tracking-wider px-1">
                <Pin className="w-3 h-3 text-[#FF99AA]" />
                <span>Notas Fijadas</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onOpenEdit={handleOpenEdit}
                    onCopy={handleCopyNote}
                    copiedNoteId={copiedNoteId}
                    onTogglePin={(id, isPinned) => onUpdateNote(id, { isPinned })}
                    onDeletePrompt={setNoteToDelete}
                    onChangeColor={(id, color) => onUpdateNote(id, { color })}
                    onToggleCheckbox={(lineIndex, checked) => handleToggleNoteCheckbox(note, lineIndex, checked)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Notes Section */}
          {otherNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2 mb-3 text-[11px] font-bold text-white/50 uppercase tracking-wider px-1">
                  <span>Otras Notas</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onOpenEdit={handleOpenEdit}
                    onCopy={handleCopyNote}
                    copiedNoteId={copiedNoteId}
                    onTogglePin={(id, isPinned) => onUpdateNote(id, { isPinned })}
                    onDeletePrompt={setNoteToDelete}
                    onChangeColor={(id, color) => onUpdateNote(id, { color })}
                    onToggleCheckbox={(lineIndex, checked) => handleToggleNoteCheckbox(note, lineIndex, checked)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Note Modal with Full Styling and Remarcar Tools */}
      {isComposerOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onMouseDown={(e) => {
            mouseDownBackdropRef.current = e.target;
          }}
          onClick={(e) => {
            if (justResizedRef.current || isResizingBoxRef.current || isResizingBox) {
              justResizedRef.current = false;
              return;
            }
            if (mouseDownBackdropRef.current === e.currentTarget && e.target === e.currentTarget) {
              setIsComposerOpen(false);
              setNewTitle('');
              setNewContent('');
              setIsComposerMaximized(false);
            }
          }}
        >
          <div
            ref={composerBoxRef}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-[#242424] border border-[#5C464B]/60 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col text-[#FFE8EF] ${
              isComposerMaximized
                ? 'w-[96vw] h-[92dvh] rounded-2xl'
                : 'w-[96vw] max-w-[96vw] max-h-[92dvh]'
            } ${isResizingBox ? 'select-none transition-none' : 'transition-all duration-150'}`}
            style={
              isComposerMaximized
                ? { width: '96vw', height: '92dvh' }
                : {
                    width: `min(96vw, ${composerSize.width}px)`,
                    height: `min(92dvh, ${composerSize.height}px)`,
                    minWidth: '360px',
                    minHeight: '380px',
                    maxWidth: '96vw',
                    maxHeight: '92dvh',
                  }
            }
          >
            {/* Top Color Accent Line */}
            <div 
              className="h-1.5 w-full transition-colors shrink-0" 
              style={{ backgroundColor: newColor }} 
            />

            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-[#5C464B]/40 bg-[#1F1F1F] flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <StickyNote className="w-4 h-4 text-[#FF688B] shrink-0" />
                <h3 className="text-sm font-extrabold text-white truncate">Nueva Nota Rápida</h3>
                {!isComposerMaximized && (
                  <span className="hidden md:inline-flex items-center text-[10px] font-semibold text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 shrink-0">
                    {Math.round(composerSize.width)} × {Math.round(composerSize.height)} px
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Size Presets for Desktop */}
                {!isComposerMaximized && (
                  <div className="hidden sm:flex items-center gap-1 bg-black/40 border border-white/10 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        const next = { width: 560, height: 460 };
                        setComposerSize(next);
                        try { localStorage.setItem('minimal_plan_note_composer_size', JSON.stringify(next)); } catch {}
                      }}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        composerSize.width <= 580 ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                      }`}
                      title="Tamaño compacto"
                    >
                      Compacto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { width: 680, height: 560 };
                        setComposerSize(next);
                        try { localStorage.setItem('minimal_plan_note_composer_size', JSON.stringify(next)); } catch {}
                      }}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        composerSize.width > 580 && composerSize.width < 880 ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                      }`}
                      title="Tamaño estándar cómodo"
                    >
                      Estándar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { width: 940, height: 680 };
                        setComposerSize(next);
                        try { localStorage.setItem('minimal_plan_note_composer_size', JSON.stringify(next)); } catch {}
                      }}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        composerSize.width >= 880 ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                      }`}
                      title="Tamaño amplio"
                    >
                      Amplio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { width: 680, height: 560 };
                        setComposerSize(next);
                        try { localStorage.setItem('minimal_plan_note_composer_size', JSON.stringify(next)); } catch {}
                      }}
                      className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      title="Restablecer tamaño predeterminado"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Maximize / Restore Button */}
                <button
                  type="button"
                  onClick={() => setIsComposerMaximized(!isComposerMaximized)}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all hidden sm:flex items-center justify-center"
                  title={isComposerMaximized ? "Restaurar tamaño personalizado" : "Pantalla completa"}
                >
                  {isComposerMaximized ? <Minimize2 className="w-4 h-4 text-[#FF688B]" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsComposerOpen(false);
                    setNewTitle('');
                    setNewContent('');
                    setIsComposerMaximized(false);
                  }}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateNote} className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 text-xs flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Título (opcional)"
                    className="w-full px-3 py-2 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-xl font-bold text-white placeholder-white/40 focus:outline-hidden focus:border-[#FF688B]"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-black/40 border border-white/10 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setComposerMode('write')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          composerMode === 'write' ? 'bg-[#FFD1DB] text-[#1F1F1F]' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Escribir
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerMode('preview')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          composerMode === 'preview' ? 'bg-[#FFD1DB] text-[#1F1F1F]' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Ver estilo
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNewIsPinned(!newIsPinned)}
                      className={`p-2 rounded-xl border transition-all ${
                        newIsPinned 
                          ? 'bg-[#FF688B] text-white border-[#FF688B]' 
                          : 'text-white/40 border-white/10 hover:text-white'
                      }`}
                      title={newIsPinned ? 'Desfijar nota' : 'Fijar nota arriba'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {composerMode === 'write' && (
                  <div className="shrink-0 flex flex-wrap items-center gap-1 py-1 px-1.5 bg-black/35 border border-white/10 rounded-xl text-xs text-white/70">
                    <button
                      type="button"
                      onClick={() => insertFormatting(composerTextareaRef.current, '==', '==', 'texto remarcado', newContent, setNewContent)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-400/20 hover:text-amber-300 text-amber-400 font-bold transition-all text-[11px]"
                      title="Remarcar texto (Resaltador amarillo)"
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                      <span>Remarcar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertFormatting(composerTextareaRef.current, '==rose:', '==', 'resaltado rosa', newContent, setNewContent)}
                      className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-[#FF6688]/20 hover:text-[#FFB0CC] text-[#FF99AA] font-bold transition-all text-[11px]"
                      title="Remarcar en color rosa"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#FF6688]" />
                      <span>Rosa</span>
                    </button>

                    <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

                    <button
                      type="button"
                      onClick={() => insertFormatting(composerTextareaRef.current, '**', '**', 'negrita', newContent, setNewContent)}
                      className="p-1 rounded-lg hover:bg-white/15 hover:text-white transition-all"
                      title="Negrita"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting(composerTextareaRef.current, '*', '*', 'cursiva', newContent, setNewContent)}
                      className="p-1 rounded-lg hover:bg-white/15 hover:text-white transition-all"
                      title="Cursiva"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting(composerTextareaRef.current, '<u>', '</u>', 'subrayado', newContent, setNewContent)}
                      className="p-1 rounded-lg hover:bg-white/15 hover:text-white transition-all"
                      title="Subrayado"
                    >
                      <UnderlineIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting(composerTextareaRef.current, '~~', '~~', 'tachado', newContent, setNewContent)}
                      className="p-1 rounded-lg hover:bg-white/15 hover:text-white transition-all"
                      title="Tachado"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

                    <button
                      type="button"
                      onClick={() => insertLinePrefix(composerTextareaRef.current, '- ', newContent, setNewContent)}
                      className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-white/15 hover:text-white transition-all text-[11px]"
                      title="Lista con viñetas"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Lista</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertLinePrefix(composerTextareaRef.current, '- [ ] ', newContent, setNewContent)}
                      className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-white/15 hover:text-white transition-all text-[11px]"
                      title="Casilla de verificación / Tarea"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Tarea</span>
                    </button>
                  </div>
                )}

                <div className="flex-1 flex flex-col min-h-[160px]">
                  {composerMode === 'write' ? (
                    <textarea
                      ref={composerTextareaRef}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Escribe lo que tienes en mente... Puedes usar los botones de arriba para remarcar o dar formato al texto."
                      className="w-full flex-1 min-h-[160px] p-3.5 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-xl text-xs text-white placeholder-white/40 focus:outline-hidden focus:border-[#FF688B] resize-y leading-relaxed font-medium"
                    />
                  ) : (
                    <div className="flex-1 p-3.5 bg-black/30 border border-white/10 rounded-2xl min-h-[160px] overflow-y-auto">
                      {newContent.trim() ? (
                        <FormattedNoteContent content={newContent} />
                      ) : (
                        <span className="text-white/30 text-xs italic">Escribe texto para ver la vista previa con estilo.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom bar */}
              <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-[#5C464B]/50 bg-[#1F1F1F] flex items-center justify-between gap-2 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] select-none">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-white/40 mr-1" />
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewColor(c.hex)}
                      className={`w-4 h-4 rounded-full transition-all ${
                        newColor === c.hex ? 'ring-2 ring-white scale-125' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {!isComposerMaximized && (
                    <span className="hidden sm:inline-flex items-center text-[10px] text-white/40 font-medium select-none pr-1">
                      ↔ Arrastra bordes o esquina para expandir
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposerOpen(false);
                      setNewTitle('');
                      setNewContent('');
                      setIsComposerMaximized(false);
                    }}
                    className="px-3.5 py-1.5 text-xs text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim() && !newContent.trim()}
                    className="px-5 py-2 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] disabled:opacity-40 disabled:pointer-events-none text-white rounded-full transition-all shadow-md shadow-[#FF688B]/30 active:scale-95"
                  >
                    Guardar Nota
                  </button>
                </div>
              </div>

              {/* Interactive Resizing Handles on Desktop */}
              {!isComposerMaximized && (
                <>
                  {/* Right border drag handle */}
                  <div
                    onMouseDown={(e) => startResize(e, 'horizontal', false)}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:block absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-[#FF688B]/30 transition-colors z-30 group"
                    title="Arrastra para cambiar el ancho libremente"
                  >
                    <div className="w-0.5 h-8 bg-white/20 rounded-full mx-auto relative top-1/2 -translate-y-1/2 group-hover:bg-[#FF688B]" />
                  </div>

                  {/* Bottom border drag handle */}
                  <div
                    onMouseDown={(e) => startResize(e, 'vertical', false)}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:block absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize hover:bg-[#FF688B]/30 transition-colors z-30 group"
                    title="Arrastra para cambiar el alto libremente"
                  >
                    <div className="h-0.5 w-8 bg-white/20 rounded-full mx-auto relative top-1/2 -translate-y-1/2 group-hover:bg-[#FF688B]" />
                  </div>

                  {/* Bottom-right corner drag handle */}
                  <div
                    onMouseDown={(e) => startResize(e, 'both', false)}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:flex absolute bottom-1 right-1 w-6 h-6 items-center justify-center cursor-nwse-resize text-white/40 hover:text-[#FF688B] hover:bg-white/10 rounded-br-2xl transition-all z-40 select-none group"
                    title="Arrastra para expandir o ajustar el tamaño libremente en ancho y alto"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="group-hover:scale-110 transition-transform">
                      <circle cx="10" cy="2" r="1.2" />
                      <circle cx="10" cy="6" r="1.2" />
                      <circle cx="6" cy="6" r="1.2" />
                      <circle cx="10" cy="10" r="1.2" />
                      <circle cx="6" cy="10" r="1.2" />
                      <circle cx="2" cy="10" r="1.2" />
                    </svg>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Edit Note Modal with Full Styling and Remarcar Tools */}
      {editingNote && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onMouseDown={(e) => {
            mouseDownBackdropRef.current = e.target;
          }}
          onClick={(e) => {
            if (justResizedRef.current || isResizingBoxRef.current || isResizingBox) {
              justResizedRef.current = false;
              return;
            }
            if (mouseDownBackdropRef.current === e.currentTarget && e.target === e.currentTarget) {
              setEditingNote(null);
            }
          }}
        >
          <div
            ref={editBoxRef}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-[#161625]/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] ring-1 ring-white/10 flex flex-col text-[#FFE8EF] ${
              isEditMaximized
                ? 'w-[96vw] h-[92dvh] rounded-2xl'
                : 'w-[96vw] max-w-[96vw] max-h-[92dvh]'
            } ${isResizingBox ? 'select-none transition-none' : 'transition-all duration-150'}`}
            style={
              isEditMaximized
                ? { width: '96vw', height: '92dvh' }
                : {
                    width: `min(96vw, ${editModalSize.width}px)`,
                    height: `min(92dvh, ${editModalSize.height}px)`,
                    minWidth: '360px',
                    minHeight: '380px',
                    maxWidth: '96vw',
                    maxHeight: '92dvh',
                  }
            }
          >
            <div 
              className="h-1.5 w-full transition-colors shrink-0" 
              style={{ backgroundColor: editColor }} 
            />

            <div className="px-5 py-3 border-b border-white/10 bg-white/[0.03] flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Edit3 className="w-4 h-4 text-[#FF99AA] shrink-0" />
                <h3 className="text-sm font-extrabold text-white truncate">Editar Nota y Estilos</h3>
                {!isEditMaximized && (
                  <span className="hidden md:inline-flex items-center text-[10px] font-semibold text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 shrink-0">
                    {Math.round(editModalSize.width)} × {Math.round(editModalSize.height)} px
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isEditMaximized && (
                  <div className="hidden sm:flex items-center gap-1 bg-black/40 border border-white/10 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setEditModalSize({ width: 560, height: 460 })}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        editModalSize.width <= 580 ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                      }`}
                      title="Tamaño compacto"
                    >
                      Compacto
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModalSize({ width: 680, height: 560 })}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        editModalSize.width > 580 && editModalSize.width < 880 ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                      }`}
                      title="Tamaño estándar"
                    >
                      Estándar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModalSize({ width: 940, height: 680 })}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        editModalSize.width >= 880 ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                      }`}
                      title="Tamaño amplio"
                    >
                      Amplio
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditMaximized(!isEditMaximized)}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all hidden sm:flex items-center justify-center"
                  title={isEditMaximized ? "Restaurar tamaño normal" : "Pantalla completa"}
                >
                  {isEditMaximized ? <Minimize2 className="w-4 h-4 text-[#FF99AA]" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 text-xs flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Título (opcional)"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl font-bold text-white placeholder-white/40 focus:outline-hidden focus:border-[#FF99AA]"
                  />
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-black/40 border border-white/10 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setEditMode('write')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          editMode === 'write' ? 'bg-[#FF99AA] text-[#0F0F1A]' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Escribir
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditMode('preview')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          editMode === 'preview' ? 'bg-[#FF99AA] text-[#0F0F1A]' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Ver estilo
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditIsPinned(!editIsPinned)}
                      className={`p-2 rounded-xl border transition-all ${
                        editIsPinned 
                          ? 'bg-[#FF99AA] text-[#0F0F1A] border-[#FFB0CC]' 
                          : 'text-white/40 border-white/10 hover:text-white'
                      }`}
                      title={editIsPinned ? 'Nota fijada' : 'Fijar nota'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Rich Formatting Toolbar in Edit Modal */}
                {editMode === 'write' && (
                  <div className="shrink-0 flex flex-wrap items-center gap-1 py-1 px-1.5 bg-black/35 border border-white/10 rounded-xl text-xs text-white/70">
                    <button
                      type="button"
                      onClick={() => insertFormatting(editTextareaRef.current, '==', '==', 'texto remarcado', editContent, setEditContent)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-400/20 hover:text-amber-300 text-amber-400 font-bold transition-all text-[11px]"
                      title="Remarcar texto (Resaltador amarillo)"
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                      <span>Remarcar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertFormatting(editTextareaRef.current, '==rose:', '==', 'resaltado rosa', editContent, setEditContent)}
                      className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-[#FF6688]/20 hover:text-[#FFB0CC] text-[#FF99AA] font-bold transition-all text-[11px]"
                      title="Remarcar en color rosa"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#FF6688]" />
                      <span>Rosa</span>
                    </button>

                    <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

                    <button
                      type="button"
                      onClick={() => insertFormatting(editTextareaRef.current, '**', '**', 'negrita', editContent, setEditContent)}
                      className="p-1 rounded-lg hover:bg-white/15 hover:text-white transition-all"
                      title="Negrita (**texto**)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => insertFormatting(editTextareaRef.current, '*', '*', 'cursiva', editContent, setEditContent)}
                      className="p-1 rounded-lg hover:bg-white/15 hover:text-white transition-all"
                      title="Cursiva (*texto*)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => insertFormatting(editTextareaRef.current, '<u>', '</u>', 'subrayado', editContent, setEditContent)}
                      className="p-1 rounded-lg hover:bg-white/15 hover:text-white transition-all"
                      title="Subrayado (<u>texto</u>)"
                    >
                      <UnderlineIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => insertFormatting(editTextareaRef.current, '~~', '~~', 'tachado', editContent, setEditContent)}
                      className="p-1 rounded-lg hover:bg-white/15 hover:text-white transition-all"
                      title="Tachado (~~texto~~)"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

                    <button
                      type="button"
                      onClick={() => insertLinePrefix(editTextareaRef.current, '- ', editContent, setEditContent)}
                      className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-white/15 hover:text-white transition-all text-[11px]"
                      title="Lista con viñetas"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Lista</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertLinePrefix(editTextareaRef.current, '- [ ] ', editContent, setEditContent)}
                      className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-white/15 hover:text-white transition-all text-[11px]"
                      title="Casilla de verificación / Tarea"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Tarea</span>
                    </button>
                  </div>
                )}

                <div className="flex-1 flex flex-col min-h-[160px]">
                  {editMode === 'write' ? (
                    <textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Contenido de la nota..."
                      className="w-full flex-1 min-h-[160px] p-3.5 bg-white/[0.04] border border-white/15 rounded-xl text-xs text-white placeholder-white/40 focus:outline-hidden focus:border-[#FF99AA] leading-relaxed font-medium resize-y"
                    />
                  ) : (
                    <div className="flex-1 p-3.5 bg-black/30 border border-white/10 rounded-2xl min-h-[160px] overflow-y-auto">
                      {editContent.trim() ? (
                        <FormattedNoteContent content={editContent} />
                      ) : (
                        <span className="text-white/30 text-xs italic">Sin contenido aún.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom bar */}
              <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-white/10 bg-white/[0.03] flex items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-1.5">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setEditColor(c.hex)}
                      className={`w-4 h-4 rounded-full transition-all ${
                        editColor === c.hex ? 'ring-2 ring-white scale-125' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {!isEditMaximized && (
                    <span className="hidden sm:inline-flex items-center text-[10px] text-white/40 font-medium select-none pr-1">
                      ↔ Arrastra bordes o esquina para expandir
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingNote(null)}
                    className="px-3 py-1.5 text-xs text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-extrabold bg-gradient-to-r from-[#FF6688] to-[#FF99AA] text-[#0F0F1A] rounded-full transition-all shadow-md shadow-[#FF6688]/30 active:scale-95"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>

              {/* Interactive Resizing Handles on Desktop */}
              {!isEditMaximized && (
                <>
                  <div
                    onMouseDown={(e) => startResize(e, 'horizontal', true)}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:block absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-[#FF99AA]/30 transition-colors z-30 group"
                    title="Arrastra para cambiar el ancho libremente"
                  >
                    <div className="w-0.5 h-8 bg-white/20 rounded-full mx-auto relative top-1/2 -translate-y-1/2 group-hover:bg-[#FF99AA]" />
                  </div>

                  <div
                    onMouseDown={(e) => startResize(e, 'vertical', true)}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:block absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize hover:bg-[#FF99AA]/30 transition-colors z-30 group"
                    title="Arrastra para cambiar el alto libremente"
                  >
                    <div className="h-0.5 w-8 bg-white/20 rounded-full mx-auto relative top-1/2 -translate-y-1/2 group-hover:bg-[#FF99AA]" />
                  </div>

                  <div
                    onMouseDown={(e) => startResize(e, 'both', true)}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:flex absolute bottom-1 right-1 w-6 h-6 items-center justify-center cursor-nwse-resize text-white/40 hover:text-[#FF99AA] hover:bg-white/10 rounded-br-2xl transition-all z-40 select-none group"
                    title="Arrastra para expandir o ajustar el tamaño libremente en ancho y alto"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="group-hover:scale-110 transition-transform">
                      <circle cx="10" cy="2" r="1.2" />
                      <circle cx="10" cy="6" r="1.2" />
                      <circle cx="6" cy="6" r="1.2" />
                      <circle cx="10" cy="10" r="1.2" />
                      <circle cx="6" cy="10" r="1.2" />
                      <circle cx="2" cy="10" r="1.2" />
                    </svg>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setNoteToDelete(null)}
        >
          <div
            className="relative bg-[#161625]/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] ring-1 ring-white/10 w-full max-w-sm flex flex-col overflow-hidden text-[#FFE8EF] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/30">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">¿Eliminar nota?</h3>
                <span className="text-[11px] text-white/50">Esta acción no se puede deshacer</span>
              </div>
            </div>
            
            <p className="text-xs text-[#FFE8EF]/75 leading-relaxed mb-5">
              ¿Deseas eliminar la nota {noteToDelete.title ? <strong className="text-white">«{noteToDelete.title}»</strong> : 'seleccionada'}?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#FFE8EF]/75 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(noteToDelete.id);
                  setNoteToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-md shadow-rose-600/30 active:scale-95"
              >
                Eliminar nota
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

interface NoteCardProps {
  note: QuickNote;
  onOpenEdit: (note: QuickNote) => void;
  onCopy: (note: QuickNote) => void;
  copiedNoteId: string | null;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDeletePrompt: (note: QuickNote) => void;
  onChangeColor: (id: string, color: string) => void;
  onToggleCheckbox: (lineIndex: number, currentChecked: boolean) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onOpenEdit,
  onCopy,
  copiedNoteId,
  onTogglePin,
  onDeletePrompt,
  onChangeColor,
  onToggleCheckbox,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const isCopied = copiedNoteId === note.id;

  return (
    <div
      className="relative bg-[#252525] border border-[#5C464B]/50 rounded-3xl p-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] flex flex-col justify-between transition-all duration-200 hover:border-[#FF688B]/60 group overflow-hidden"
    >
      {/* Top Color Accent Line */}
      <div 
        className="absolute top-0 inset-x-0 h-1 transition-all duration-200" 
        style={{ backgroundColor: note.color || '#FF688B' }} 
      />

      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {note.title ? (
            <h4 className="text-sm font-extrabold text-white tracking-tight leading-snug break-words flex-1">
              {note.title}
            </h4>
          ) : (
            <div className="flex-1" />
          )}

          <button
            onClick={() => onTogglePin(note.id, !note.isPinned)}
            className={`p-1.5 rounded-xl transition-all shrink-0 ${
              note.isPinned 
                ? 'text-[#FF99AA] bg-white/10' 
                : 'text-white/30 hover:text-white opacity-0 group-hover:opacity-100 hover:bg-white/10'
            }`}
            title={note.isPinned ? 'Desfijar nota' : 'Fijar nota'}
          >
            <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-[#FF99AA]' : ''}`} />
          </button>
        </div>

        {/* Card Content with Full Formatted Rendering (Highlight, Bold, Italic, Checklists) */}
        <div 
          onClick={() => onOpenEdit(note)}
          className="text-xs text-[#FFE8EF]/85 font-medium cursor-pointer mb-3"
        >
          <FormattedNoteContent 
            content={note.content} 
            interactiveCheckboxes={true}
            onToggleCheckbox={onToggleCheckbox}
          />
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
        <span className="text-[10px] text-white/40 font-mono">
          {new Date(note.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </span>

        <div className="flex items-center gap-1">
          {/* Color changer trigger */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Cambiar color"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {showColorPicker && (
              <div 
                className="absolute right-0 bottom-full mb-1.5 p-1.5 bg-[#161625] border border-white/20 rounded-2xl shadow-xl flex items-center gap-1 z-30 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowColorPicker(false)}
              >
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      onChangeColor(note.id, c.hex);
                      setShowColorPicker(false);
                    }}
                    className={`w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 ${
                      note.color === c.hex ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Copy button */}
          <button
            onClick={() => onCopy(note)}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Copiar texto"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Edit button */}
          <button
            onClick={() => onOpenEdit(note)}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Editar nota y estilos"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            onClick={() => onDeletePrompt(note)}
            className="p-1 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
            title="Eliminar nota"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Highlighter,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  CheckSquare,
  ChevronDown,
  Check,
} from 'lucide-react';

export interface HighlightColorOption {
  id: string;
  label: string;
  dotColor: string;
  textColor: string;
  badgeBg: string;
  markClass: string;
  prefix: string;
}

export const HIGHLIGHT_COLORS: HighlightColorOption[] = [
  {
    id: 'yellow',
    label: 'Amarillo',
    dotColor: '#EAB308',
    textColor: 'text-amber-300',
    badgeBg: 'hover:bg-amber-400/20',
    markClass: 'bg-amber-400/30 text-amber-200 border border-amber-400/60 shadow-[0_0_8px_rgba(234,179,8,0.2)]',
    prefix: 'yellow:',
  },
  {
    id: 'rose',
    label: 'Rosa',
    dotColor: '#FF688B',
    textColor: 'text-[#FF99AA]',
    badgeBg: 'hover:bg-[#FF688B]/20',
    markClass: 'bg-[#FF688B]/30 text-[#FFE8EF] border border-[#FF688B]/70 shadow-[0_0_8px_rgba(255,104,139,0.2)]',
    prefix: 'rose:',
  },
  {
    id: 'green',
    label: 'Verde',
    dotColor: '#10B981',
    textColor: 'text-emerald-300',
    badgeBg: 'hover:bg-emerald-500/20',
    markClass: 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
    prefix: 'green:',
  },
  {
    id: 'blue',
    label: 'Azul',
    dotColor: '#38BDF8',
    textColor: 'text-sky-300',
    badgeBg: 'hover:bg-sky-500/20',
    markClass: 'bg-sky-500/25 text-sky-200 border border-sky-400/60 shadow-[0_0_8px_rgba(56,189,248,0.15)]',
    prefix: 'blue:',
  },
  {
    id: 'purple',
    label: 'Morado',
    dotColor: '#C084FC',
    textColor: 'text-purple-300',
    badgeBg: 'hover:bg-purple-500/20',
    markClass: 'bg-purple-500/25 text-purple-200 border border-purple-400/60 shadow-[0_0_8px_rgba(192,132,252,0.15)]',
    prefix: 'purple:',
  },
  {
    id: 'orange',
    label: 'Naranja',
    dotColor: '#FB923C',
    textColor: 'text-orange-300',
    badgeBg: 'hover:bg-orange-500/20',
    markClass: 'bg-orange-500/25 text-orange-200 border border-orange-400/60 shadow-[0_0_8px_rgba(251,146,60,0.15)]',
    prefix: 'orange:',
  },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Normalizes formatting tags that span across multiple newlines (like ==yellow:line1\nline2==)
 * by distributing the tag onto each non-empty line.
 */
export function normalizeMultilineFormatting(rawContent: string): string {
  if (!rawContent) return '';
  let res = rawContent;

  // Clean trailing color prefixes attached to words before ==, e.g. "impresogreen:==" -> "impreso=="
  res = res.replace(/(yellow|rose|green|blue|purple|orange):==/gi, '==');

  // Clean nested highlight markers like ==rose:==rose:texto==== -> ==rose:texto==
  res = res.replace(/==([a-zA-Z]+:)?==([a-zA-Z]+:)?([\s\S]+?)====/g, '==$1$3==');

  // Distribute highlight tags across newlines
  res = res.replace(/==([a-zA-Z]+:)?([\s\S]+?)==/g, (match, prefix, inner) => {
    const colorPrefix = prefix || '';
    const cleanInner = inner.replace(/==/g, '').replace(/^[a-zA-Z]+:/, '');
    if (!cleanInner.includes('\n')) return `==${colorPrefix}${cleanInner}==`;
    return cleanInner
      .split('\n')
      .map((line) => (line.trim() ? `==${colorPrefix}${line}==` : line))
      .join('\n');
  });

  // Distribute bold tags across newlines
  res = res.replace(/\*\*([\s\S]+?)\*\*/g, (match, inner) => {
    if (!inner.includes('\n')) return match;
    return inner
      .split('\n')
      .map((line) => (line.trim() ? `**${line}**` : line))
      .join('\n');
  });

  // Distribute italic tags across newlines
  res = res.replace(/(?<!\*)\*([\s\S]+?)\*(?!\*)/g, (match, inner) => {
    if (!inner.includes('\n')) return match;
    return inner
      .split('\n')
      .map((line) => (line.trim() ? `*${line}*` : line))
      .join('\n');
  });

  return res;
}

/**
 * Converts markdown formatting to visual HTML for the contentEditable editor.
 */
export function markdownToHtml(md: string): string {
  if (!md) return '';

  const normalized = normalizeMultilineFormatting(md);
  const lines = normalized.split('\n');
  const htmlLines = lines.map((line) => {
    // Checklist line: - [ ] or - [x]
    const checkMatch = line.match(/^(\s*[-*]?\s*)\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      const isChecked = checkMatch[2].toLowerCase() === 'x';
      const text = formatInlineTokens(checkMatch[3]);
      return `<div data-type="task" data-checked="${isChecked ? 'true' : 'false'}" class="task-line flex items-start gap-2 pl-1 py-0.5 leading-relaxed"><input type="checkbox"${isChecked ? ' checked' : ''} class="mt-1 rounded accent-[#FF688B] cursor-pointer shrink-0" /><span class="task-content flex-1 min-w-0 ${isChecked ? 'line-through opacity-50' : ''}">${text || '<br>'}</span></div>`;
    }

    // Bullet list line: - or * or •
    const bulletMatch = line.match(/^(\s*)[-*•]\s+(.*)$/);
    if (bulletMatch) {
      const text = formatInlineTokens(bulletMatch[2]);
      return `<div data-type="bullet" class="bullet-line flex items-start gap-2 pl-1 py-0.5 leading-relaxed"><span class="bullet-dot text-[#FF99AA] font-bold select-none shrink-0 mt-0.5 leading-none">•</span><span class="bullet-content flex-1 min-w-0">${text || '<br>'}</span></div>`;
    }

    // Quote / Callout line: >
    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      const text = formatInlineTokens(quoteMatch[1]);
      return `<div class="border-l-2 border-[#FF99AA] pl-2.5 py-0.5 text-[#FFE8EF]/90 italic bg-white/[0.02] rounded-r-lg leading-relaxed">${text || '<br>'}</div>`;
    }

    if (!line.trim()) {
      return '<div class="empty-line py-0.5 leading-relaxed min-h-[1.5em]"><br></div>';
    }

    const text = formatInlineTokens(line);
    return `<div class="leading-relaxed py-0.5">${text}</div>`;
  });

  return htmlLines.join('');
}

/**
 * Parses inline tags (**bold**, *italic*, <u>underline</u>, ~~strike~~, ==rose:highlight==)
 */
function formatInlineTokens(text: string): string {
  const regex = /(==(?:[a-zA-Z]+:)?[\s\S]+?==|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|<u>[\s\S]+?<\/u>|__[\s\S]+?__|~~[\s\S]+?~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let result = '';

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(text.substring(lastIndex, match.index));
    }
    const raw = match[0];
    if (raw.startsWith('==') && raw.endsWith('==')) {
      let inner = raw.slice(2, -2).replace(/==/g, '');
      const colonIdx = inner.indexOf(':');
      let colorId = 'rose';
      let content = inner;
      if (colonIdx > 0 && /^[a-zA-Z]+$/.test(inner.slice(0, colonIdx))) {
        colorId = inner.slice(0, colonIdx);
        content = inner.slice(colonIdx + 1);
      }
      content = content.replace(/^[a-zA-Z]+:/, '');
      const colorOpt = HIGHLIGHT_COLORS.find((c) => c.id === colorId) || HIGHLIGHT_COLORS[1];
      result += `<mark data-color="${colorOpt.id}" class="${colorOpt.markClass} rounded px-1 py-0.5 font-medium inline">${escapeHtml(content)}</mark>`;
    } else if (raw.startsWith('**') && raw.endsWith('**')) {
      result += `<strong>${escapeHtml(raw.slice(2, -2))}</strong>`;
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      result += `<em>${escapeHtml(raw.slice(1, -1))}</em>`;
    } else if (raw.startsWith('<u>') && raw.endsWith('</u>')) {
      result += `<u>${escapeHtml(raw.slice(3, -4))}</u>`;
    } else if (raw.startsWith('__') && raw.endsWith('__')) {
      result += `<u>${escapeHtml(raw.slice(2, -2))}</u>`;
    } else if (raw.startsWith('~~') && raw.endsWith('~~')) {
      result += `<s>${escapeHtml(raw.slice(2, -2))}</s>`;
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    result += escapeHtml(text.substring(lastIndex));
  }

  return result;
}

/**
 * Converts DOM back to clean markdown for storage.
 */
export function domToMarkdown(root: HTMLElement): string {
  function serializeNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      return '\n';
    }

    // Task element
    if (el.getAttribute('data-type') === 'task') {
      const isChecked = el.getAttribute('data-checked') === 'true';
      const contentEl = el.querySelector('.task-content') || el;
      const inner = Array.from(contentEl.childNodes)
        .filter((child) => (child as HTMLElement).tagName?.toLowerCase() !== 'input')
        .map(serializeNode)
        .join('')
        .trim();
      return `\n- [${isChecked ? 'x' : ' '}] ${inner}\n`;
    }

    // Bullet element
    if (el.getAttribute('data-type') === 'bullet' || tag === 'li') {
      const contentEl = el.querySelector('.bullet-content') || el;
      const inner = Array.from(contentEl.childNodes)
        .filter((child) => !((child as HTMLElement).classList?.contains('bullet-dot')))
        .map(serializeNode)
        .join('')
        .trim();
      return `\n- ${inner}\n`;
    }

    // Highlight mark
    if (tag === 'mark') {
      const color = el.getAttribute('data-color') || 'rose';
      const inner = Array.from(el.childNodes).map(serializeNode).join('');
      if (!inner.trim()) return '';
      // Strip any nested markers to prevent ==rose:==rose:text====
      const cleanInner = inner.replace(/==([a-zA-Z]+:)?/g, '').replace(/==/g, '');
      if (cleanInner.includes('\n')) {
        return cleanInner
          .split('\n')
          .map((l) => (l.trim() ? `==${color}:${l}==` : l))
          .join('\n');
      }
      return `==${color}:${cleanInner}==`;
    }

    // Bold
    if (tag === 'strong' || tag === 'b') {
      const inner = Array.from(el.childNodes).map(serializeNode).join('');
      return `**${inner}**`;
    }

    // Italic
    if (tag === 'em' || tag === 'i') {
      const inner = Array.from(el.childNodes).map(serializeNode).join('');
      return `*${inner}*`;
    }

    // Underline
    if (tag === 'u') {
      const inner = Array.from(el.childNodes).map(serializeNode).join('');
      return `<u>${inner}</u>`;
    }

    // Strikethrough
    if (tag === 's' || tag === 'del' || tag === 'strike') {
      const inner = Array.from(el.childNodes).map(serializeNode).join('');
      return `~~${inner}~~`;
    }

    // Block container: div or p
    if (tag === 'div' || tag === 'p') {
      const inner = Array.from(el.childNodes).map(serializeNode).join('');
      return `${inner}\n`;
    }

    return Array.from(el.childNodes).map(serializeNode).join('');
  }

  const raw = Array.from(root.childNodes).map(serializeNode).join('');
  // Clean up excess duplicate newlines while preserving paragraphs
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}

interface RichNoteEditorProps {
  initialValue: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  activeColor: HighlightColorOption;
  onSelectColor: (color: HighlightColorOption) => void;
}

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({
  initialValue,
  onChange,
  placeholder = 'Escribe tu nota aquí...',
  minHeight = '180px',
  className = '',
  activeColor,
  onSelectColor,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialValue.trim());
  const savedSelectionRange = useRef<Range | null>(null);
  const isInternalChange = useRef(false);

  // Initialize editor HTML
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    editorRef.current.innerHTML = markdownToHtml(initialValue);
    setIsEmpty(!editorRef.current.textContent?.trim());
  }, [initialValue]);

  // Save selection on mouseup/keyup
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRange.current = range.cloneRange();
      }
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedSelectionRange.current && editorRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRange.current);
      }
    }
  }, []);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const textContent = editorRef.current.textContent || '';
    setIsEmpty(!textContent.trim());
    const md = domToMarkdown(editorRef.current);
    onChange(md);
  }, [onChange]);

  const unwrapMark = (mark: HTMLElement) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      const child = mark.firstChild;
      if (child.nodeName.toLowerCase() === 'mark') {
        while (child.firstChild) {
          parent.insertBefore(child.firstChild, mark);
        }
        child.remove();
      } else {
        parent.insertBefore(child, mark);
      }
    }
    parent.removeChild(mark);
  };

  const getMarksInSelection = (range: Range, editor: HTMLElement): HTMLElement[] => {
    const marks = new Set<HTMLElement>();

    // 1. Check if common ancestor or any parent is a mark
    let parent: Node | null = range.commonAncestorContainer;
    while (parent && parent !== editor) {
      if (parent.nodeName.toLowerCase() === 'mark') {
        marks.add(parent as HTMLElement);
        break;
      }
      parent = parent.parentNode;
    }

    // 2. Check all marks in editor that intersect the selection range
    const allMarks = editor.querySelectorAll('mark');
    allMarks.forEach((m) => {
      try {
        if (range.intersectsNode(m)) {
          marks.add(m);
        }
      } catch {}
    });

    return Array.from(marks);
  };

  const unhighlightSelection = (range: Range, editor: HTMLElement) => {
    const marks = getMarksInSelection(range, editor);
    if (marks.length === 0) return;

    marks.forEach((mark) => {
      const markRange = document.createRange();
      markRange.selectNodeContents(mark);

      const coversStart = range.compareBoundaryPoints(Range.START_TO_START, markRange) <= 0;
      const coversEnd = range.compareBoundaryPoints(Range.END_TO_END, markRange) >= 0;

      // If selection covers the whole mark, unwrap it cleanly
      if (coversStart && coversEnd) {
        unwrapMark(mark);
        return;
      }

      // If selection only covers part of the mark, extract the selected text nodes out
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(mark, NodeFilter.SHOW_TEXT);
      let curr = walker.nextNode();
      while (curr) {
        textNodes.push(curr as Text);
        curr = walker.nextNode();
      }

      textNodes.forEach((tn) => {
        try {
          if (!range.intersectsNode(tn)) return;
        } catch {
          return;
        }

        let startOffset = 0;
        let endOffset = tn.length;
        if (range.startContainer === tn) startOffset = range.startOffset;
        if (range.endContainer === tn) endOffset = range.endOffset;

        if (startOffset >= endOffset) return;

        if (startOffset === 0 && endOffset === tn.length) {
          mark.parentNode?.insertBefore(tn, mark);
        } else {
          let mid = tn;
          if (endOffset < tn.length) {
            mid.splitText(endOffset);
          }
          if (startOffset > 0) {
            mid = mid.splitText(startOffset);
          }
          mark.parentNode?.insertBefore(mid, mark);
        }
      });

      if (!mark.textContent || mark.textContent.trim().length === 0) {
        mark.remove();
      }
    });

    // Remove any remaining empty marks
    editor.querySelectorAll('mark').forEach((m) => {
      if (!m.textContent || m.textContent.trim().length === 0) {
        m.remove();
      }
    });

    editor.normalize();
  };

  // Apply highlight with selected color directly to visual text or desmarcar (toggle off)
  const applyHighlight = useCallback(
    (colorOption: HighlightColorOption | null) => {
      restoreSelection();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editorRef.current) return;

      const range = sel.getRangeAt(0);
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        editorRef.current.focus({ preventScroll: true });
        return;
      }

      const intersectingMarks = getMarksInSelection(range, editorRef.current);

      // Desmarcar condition:
      // If colorOption is null (user clicked Desmarcar)
      // OR if user selected already-highlighted text and clicks to toggle off
      const shouldDesmarcar =
        colorOption === null ||
        (intersectingMarks.length > 0 &&
          intersectingMarks.every((m) => m.getAttribute('data-color') === colorOption.id));

      if (shouldDesmarcar) {
        unhighlightSelection(range, editorRef.current);
        handleInput();
        return;
      }

      // If user selected existing marks and chose a different color, update their color
      if (intersectingMarks.length > 0 && colorOption !== null) {
        intersectingMarks.forEach((m) => {
          m.setAttribute('data-color', colorOption.id);
          m.className = `${colorOption.markClass} rounded px-1 py-0.5 font-medium inline`;
        });
        editorRef.current.normalize();
        handleInput();
        return;
      }

      if (range.collapsed || colorOption === null) {
        return;
      }

      // Apply highlight across text nodes without wrapping block containers into marks
      const walker = document.createTreeWalker(
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentNode || editorRef.current
          : range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT
      );

      const textNodes: Text[] = [];
      let curr = walker.nextNode();
      while (curr) {
        if (curr.textContent && curr.textContent.trim().length > 0) {
          try {
            if (range.intersectsNode(curr)) {
              textNodes.push(curr as Text);
            }
          } catch {}
        }
        curr = walker.nextNode();
      }

      if (textNodes.length === 0) {
        try {
          const mark = document.createElement('mark');
          mark.setAttribute('data-color', colorOption.id);
          mark.className = `${colorOption.markClass} rounded px-1 py-0.5 font-medium inline`;
          const fragment = range.extractContents();
          mark.appendChild(fragment);
          range.insertNode(mark);
        } catch (err) {
          console.error('Error applying highlight:', err);
        }
      } else {
        textNodes.forEach((tn) => {
          if (tn.parentElement?.tagName.toLowerCase() === 'mark') {
            tn.parentElement.setAttribute('data-color', colorOption.id);
            tn.parentElement.className = `${colorOption.markClass} rounded px-1 py-0.5 font-medium inline`;
            return;
          }

          let startOffset = 0;
          let endOffset = tn.length;
          if (range.startContainer === tn) {
            startOffset = range.startOffset;
          }
          if (range.endContainer === tn) {
            endOffset = range.endOffset;
          }

          if (startOffset >= endOffset) return;

          let targetNode = tn;
          if (endOffset < tn.length) {
            targetNode.splitText(endOffset);
          }
          if (startOffset > 0) {
            targetNode = targetNode.splitText(startOffset);
          }

          const mark = document.createElement('mark');
          mark.setAttribute('data-color', colorOption.id);
          mark.className = `${colorOption.markClass} rounded px-1 py-0.5 font-medium inline`;

          targetNode.parentNode?.replaceChild(mark, targetNode);
          mark.appendChild(targetNode);
        });
      }

      editorRef.current.normalize();
      handleInput();
    },
    [handleInput, restoreSelection]
  );

  // ExecCommand for bold, italic, underline, strikethrough
  const execCmd = useCallback(
    (command: string) => {
      restoreSelection();
      if (!editorRef.current) return;
      editorRef.current.focus({ preventScroll: true });
      document.execCommand(command, false);
      handleInput();
      saveSelection();
    },
    [handleInput, restoreSelection, saveSelection]
  );

  /**
   * Finds all top-level child block elements inside editor touched by range.
   */
  const getTopLevelBlocksInRange = (editor: HTMLElement, range: Range): HTMLElement[] => {
    // Ensure all direct child nodes are wrapped elements
    Array.from(editor.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        const div = document.createElement('div');
        div.className = 'leading-relaxed py-0.5';
        editor.replaceChild(div, child);
        div.appendChild(child);
      }
    });

    const directChildren = Array.from(editor.children) as HTMLElement[];
    if (directChildren.length === 0) return [];

    if (range.collapsed) {
      let curr: Node | null = range.commonAncestorContainer;
      while (curr && curr.parentElement !== editor) {
        curr = curr.parentNode;
      }
      if (curr && curr.nodeType === Node.ELEMENT_NODE) {
        return [curr as HTMLElement];
      }
      return [directChildren[0]];
    }

    const matched: HTMLElement[] = [];
    directChildren.forEach((child) => {
      try {
        if (range.intersectsNode(child)) {
          matched.push(child);
        }
      } catch {}
    });

    return matched.length > 0 ? matched : [directChildren[0]];
  };

  /**
   * Extracts every individual line from a block element (splitting across <br>, <div>, \n).
   */
  const extractLinesFromBlock = (block: HTMLElement): string[] => {
    const clone = block.cloneNode(true) as HTMLElement;

    // If it's already a bullet or task:
    if (clone.getAttribute('data-type') === 'bullet') {
      const content = clone.querySelector('.bullet-content') || clone;
      const txt = content.textContent?.trim() || '';
      return txt ? [content.innerHTML.trim()] : [];
    }
    if (clone.getAttribute('data-type') === 'task') {
      const content = clone.querySelector('.task-content') || clone;
      const txt = content.textContent?.trim() || '';
      return txt ? [content.innerHTML.trim()] : [];
    }

    // Remove existing bullet dots or task checkboxes
    clone.querySelectorAll('.bullet-dot, input[type="checkbox"]').forEach((el) => el.remove());

    const DELIMITER = '___SPLIT_LINE_BREAK___';
    // Replace all <br> with delimiter
    clone.querySelectorAll('br').forEach((br) => {
      br.replaceWith(document.createTextNode(DELIMITER));
    });

    // Replace block tags with delimiter
    clone.querySelectorAll('div, p, li').forEach((el) => {
      el.after(document.createTextNode(DELIMITER));
    });

    const fullHtml = clone.innerHTML;
    const parts = fullHtml.split(new RegExp(`${DELIMITER}|\\r?\\n`));

    const result: string[] = [];
    parts.forEach((p) => {
      const temp = document.createElement('div');
      temp.innerHTML = p;
      if (temp.textContent?.trim()) {
        result.push(p.trim());
      }
    });

    if (result.length === 0) {
      const txt = block.textContent?.trim() || '';
      if (txt) {
        result.push(block.innerHTML.trim());
      }
    }

    return result;
  };

  // Bullet List
  const toggleBulletList = useCallback(() => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;

    const editor = editorRef.current;
    // Capture current scroll position to prevent ANY vertical movement
    const savedScrollTop = editor.scrollTop;
    const range = sel.getRangeAt(0);

    // If editor is completely empty
    if (!editor.textContent?.trim()) {
      const bulletDiv = document.createElement('div');
      bulletDiv.setAttribute('data-type', 'bullet');
      bulletDiv.className = 'bullet-line flex items-start gap-2 pl-1 py-0.5 leading-relaxed';

      const dot = document.createElement('span');
      dot.className = 'bullet-dot text-[#FF99AA] font-bold select-none shrink-0 mt-0.5 leading-none';
      dot.textContent = '•';

      const contentSpan = document.createElement('span');
      contentSpan.className = 'bullet-content flex-1 min-w-0';
      contentSpan.innerHTML = '<br>';

      bulletDiv.appendChild(dot);
      bulletDiv.appendChild(contentSpan);
      editor.innerHTML = '';
      editor.appendChild(bulletDiv);

      const newRange = document.createRange();
      newRange.setStart(contentSpan, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedSelectionRange.current = newRange;

      editor.scrollTop = savedScrollTop;
      requestAnimationFrame(() => {
        if (editorRef.current) editorRef.current.scrollTop = savedScrollTop;
      });
      handleInput();
      return;
    }

    // Get all top-level blocks in range
    const targetBlocks = getTopLevelBlocksInRange(editor, range);
    if (targetBlocks.length === 0) return;

    // Check if ALL target blocks are already bullet items
    const allAlreadyBullets = targetBlocks.every(
      (b) => b.getAttribute('data-type') === 'bullet'
    );

    // Collect all lines across target blocks (each line will be its own bullet point)
    const allLines: string[] = [];
    targetBlocks.forEach((b) => {
      const lines = extractLinesFromBlock(b);
      allLines.push(...lines);
    });

    if (allLines.length === 0) return;

    const firstTarget = targetBlocks[0];
    const newElements: HTMLElement[] = [];

    if (allAlreadyBullets) {
      // Toggle off: convert each line back into plain text div
      allLines.forEach((lineHtml) => {
        const cleanHtml = lineHtml.replace(/^\s*[-*•]\s+/, '');
        const div = document.createElement('div');
        div.className = 'leading-relaxed py-0.5';
        div.innerHTML = cleanHtml || '<br>';
        newElements.push(div);
      });
    } else {
      // Convert EVERY line into an individual bullet item
      allLines.forEach((lineHtml) => {
        const cleanHtml = lineHtml.replace(/^\s*[-*•]\s+/, '');
        const bulletDiv = document.createElement('div');
        bulletDiv.setAttribute('data-type', 'bullet');
        bulletDiv.className = 'bullet-line flex items-start gap-2 pl-1 py-0.5 leading-relaxed';

        const dot = document.createElement('span');
        dot.className = 'bullet-dot text-[#FF99AA] font-bold select-none shrink-0 mt-0.5 leading-none';
        dot.textContent = '•';

        const contentSpan = document.createElement('span');
        contentSpan.className = 'bullet-content flex-1 min-w-0';
        contentSpan.innerHTML = cleanHtml || '<br>';

        bulletDiv.appendChild(dot);
        bulletDiv.appendChild(contentSpan);
        newElements.push(bulletDiv);
      });
    }

    // Insert new elements right before the first target block
    newElements.forEach((el) => {
      editor.insertBefore(el, firstTarget);
    });

    // Remove old target blocks
    targetBlocks.forEach((b) => b.remove());

    // Place selection at the last created element
    if (newElements.length > 0) {
      const lastEl = newElements[newElements.length - 1];
      const targetSpan = lastEl.querySelector('.bullet-content') || lastEl;
      const newRange = document.createRange();
      newRange.selectNodeContents(targetSpan);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedSelectionRange.current = newRange;
    }

    // Restore scroll position to prevent ANY vertical movement
    editor.scrollTop = savedScrollTop;
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.scrollTop = savedScrollTop;
      }
    });

    handleInput();
  }, [handleInput, restoreSelection]);

  // Interactive Checklist / Task
  const toggleChecklist = useCallback(() => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;

    const editor = editorRef.current;
    const savedScrollTop = editor.scrollTop;
    const range = sel.getRangeAt(0);

    // If editor is empty
    if (!editor.textContent?.trim()) {
      const taskDiv = document.createElement('div');
      taskDiv.setAttribute('data-type', 'task');
      taskDiv.setAttribute('data-checked', 'false');
      taskDiv.className = 'task-line flex items-start gap-2 pl-1 py-0.5 leading-relaxed';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'mt-1 rounded accent-[#FF688B] cursor-pointer shrink-0';

      const contentSpan = document.createElement('span');
      contentSpan.className = 'task-content flex-1 min-w-0';
      contentSpan.innerHTML = '<br>';

      taskDiv.appendChild(checkbox);
      taskDiv.appendChild(contentSpan);
      editor.innerHTML = '';
      editor.appendChild(taskDiv);

      const newRange = document.createRange();
      newRange.setStart(contentSpan, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedSelectionRange.current = newRange;

      editor.scrollTop = savedScrollTop;
      requestAnimationFrame(() => {
        if (editorRef.current) editorRef.current.scrollTop = savedScrollTop;
      });
      handleInput();
      return;
    }

    const targetBlocks = getTopLevelBlocksInRange(editor, range);
    if (targetBlocks.length === 0) return;

    const allAlreadyTasks = targetBlocks.every(
      (b) => b.getAttribute('data-type') === 'task'
    );

    const allLines: string[] = [];
    targetBlocks.forEach((b) => {
      const lines = extractLinesFromBlock(b);
      allLines.push(...lines);
    });

    if (allLines.length === 0) return;

    const firstTarget = targetBlocks[0];
    const newElements: HTMLElement[] = [];

    if (allAlreadyTasks) {
      allLines.forEach((lineHtml) => {
        const cleanHtml = lineHtml.replace(/^(\s*[-*•]?\s*)\[([ xX])\]\s*/, '').replace(/^[-*•]\s+/, '');
        const div = document.createElement('div');
        div.className = 'leading-relaxed py-0.5';
        div.innerHTML = cleanHtml || '<br>';
        newElements.push(div);
      });
    } else {
      allLines.forEach((lineHtml) => {
        const cleanHtml = lineHtml.replace(/^(\s*[-*•]?\s*)\[([ xX])\]\s*/, '').replace(/^[-*•]\s+/, '');
        const taskDiv = document.createElement('div');
        taskDiv.setAttribute('data-type', 'task');
        taskDiv.setAttribute('data-checked', 'false');
        taskDiv.className = 'task-line flex items-start gap-2 pl-1 py-0.5 leading-relaxed';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'mt-1 rounded accent-[#FF688B] cursor-pointer shrink-0';

        const contentSpan = document.createElement('span');
        contentSpan.className = 'task-content flex-1 min-w-0';
        contentSpan.innerHTML = cleanHtml || '<br>';

        checkbox.addEventListener('change', () => {
          taskDiv.setAttribute('data-checked', checkbox.checked ? 'true' : 'false');
          if (checkbox.checked) {
            contentSpan.classList.add('line-through', 'opacity-50');
          } else {
            contentSpan.classList.remove('line-through', 'opacity-50');
          }
          handleInput();
        });

        taskDiv.appendChild(checkbox);
        taskDiv.appendChild(contentSpan);
        newElements.push(taskDiv);
      });
    }

    newElements.forEach((el) => {
      editor.insertBefore(el, firstTarget);
    });

    targetBlocks.forEach((b) => b.remove());

    if (newElements.length > 0) {
      const lastEl = newElements[newElements.length - 1];
      const targetSpan = lastEl.querySelector('.task-content') || lastEl;
      const newRange = document.createRange();
      newRange.selectNodeContents(targetSpan);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedSelectionRange.current = newRange;
    }

    editor.scrollTop = savedScrollTop;
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.scrollTop = savedScrollTop;
      }
    });

    handleInput();
  }, [handleInput, restoreSelection]);

  // Handle Enter key for clean list continuation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
      const range = sel.getRangeAt(0);

      // Check if inside a task or bullet line
      let parentLine: HTMLElement | null = null;
      let curr: Node | null = range.commonAncestorContainer;
      while (curr && curr !== editorRef.current) {
        if (
          curr.nodeType === Node.ELEMENT_NODE &&
          ((curr as HTMLElement).getAttribute('data-type') === 'task' ||
            (curr as HTMLElement).getAttribute('data-type') === 'bullet')
        ) {
          parentLine = curr as HTMLElement;
          break;
        }
        curr = curr.parentNode;
      }

      if (parentLine) {
        const textContent = parentLine.textContent?.trim() || '';
        // If empty line, exit list mode
        if (!textContent || textContent === '•') {
          e.preventDefault();
          const p = document.createElement('div');
          p.className = 'leading-relaxed py-0.5';
          p.innerHTML = '<br>';
          parentLine.parentNode?.replaceChild(p, parentLine);
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          handleInput();
          return;
        }

        // Continue next item
        const type = parentLine.getAttribute('data-type');
        e.preventDefault();
        const nextItem = document.createElement('div');
        nextItem.setAttribute('data-type', type || 'bullet');

        if (type === 'task') {
          nextItem.setAttribute('data-checked', 'false');
          nextItem.className = 'task-line flex items-start gap-2 pl-1 py-0.5 leading-relaxed';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'mt-1 rounded accent-[#FF688B] cursor-pointer shrink-0';
          const span = document.createElement('span');
          span.className = 'task-content flex-1 min-w-0';
          span.innerHTML = '<br>';

          checkbox.addEventListener('change', () => {
            nextItem.setAttribute('data-checked', checkbox.checked ? 'true' : 'false');
            if (checkbox.checked) {
              span.classList.add('line-through', 'opacity-50');
            } else {
              span.classList.remove('line-through', 'opacity-50');
            }
            handleInput();
          });

          nextItem.appendChild(checkbox);
          nextItem.appendChild(span);

          parentLine.after(nextItem);
          const newRange = document.createRange();
          newRange.setStart(span, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } else {
          nextItem.className = 'bullet-line flex items-start gap-2 pl-1 py-0.5 leading-relaxed';
          const dot = document.createElement('span');
          dot.className = 'bullet-dot text-[#FF99AA] font-bold select-none shrink-0 mt-0.5 leading-none';
          dot.textContent = '•';
          const span = document.createElement('span');
          span.className = 'bullet-content flex-1 min-w-0';
          span.innerHTML = '<br>';
          nextItem.appendChild(dot);
          nextItem.appendChild(span);

          parentLine.after(nextItem);
          const newRange = document.createRange();
          newRange.setStart(span, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
        handleInput();
      }
    }
  };

  return (
    <div className={`flex flex-col flex-1 min-h-0 space-y-2.5 ${className}`}>
      {/* Visual Formatting Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center gap-1 py-1.5 px-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white/80 select-none shadow-xs">
        {/* Remarcar button + Color Selector Dropdown */}
        <div className="relative flex items-center">
          <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyHighlight(activeColor);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${activeColor.textColor} ${activeColor.badgeBg} font-bold transition-all text-[11px] active:scale-95`}
              title={`Remarcar texto seleccionado en ${activeColor.label}`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Remarcar</span>
            </button>

            <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsColorPickerOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${activeColor.badgeBg} ${activeColor.textColor} font-bold transition-all text-[11px]`}
              title="Elegir color para remarcar"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0"
                style={{ backgroundColor: activeColor.dotColor }}
              />
              <span>{activeColor.label}</span>
              <ChevronDown
                className={`w-3 h-3 text-white/50 transition-transform ${isColorPickerOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Color dropdown menu */}
          {isColorPickerOpen && (
            <div
              className="absolute top-full left-0 mt-1.5 z-50 bg-[#1A1A24] border border-white/15 rounded-xl shadow-2xl p-1.5 min-w-[150px] flex flex-col gap-1 backdrop-blur-md"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-white/40">
                Color de resaltado
              </div>
              {HIGHLIGHT_COLORS.map((c) => {
                const isSelected = activeColor.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectColor(c);
                      setIsColorPickerOpen(false);
                      // Apply directly if text is selected
                      applyHighlight(c);
                    }}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      isSelected
                        ? 'bg-white/15 text-white font-bold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: c.dotColor }}
                      />
                      <span>{c.label}</span>
                    </div>
                    {isSelected && <Check className="w-3 h-3 text-[#FF99AA]" />}
                  </button>
                );
              })}

              <div className="w-full h-[1px] bg-white/10 my-0.5" />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsColorPickerOpen(false);
                  applyHighlight(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-300 hover:bg-white/10 hover:text-white transition-all text-left"
              >
                <span className="w-3 h-3 rounded-full border border-dashed border-rose-400/70 shrink-0 flex items-center justify-center text-[9px] text-rose-300 font-bold">✕</span>
                <span>Desmarcar (Quitar color)</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

        {/* Bold */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd('bold');
          }}
          className="p-1.5 rounded-lg hover:bg-white/15 hover:text-white transition-all text-white/70"
          title="Negrita"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd('italic');
          }}
          className="p-1.5 rounded-lg hover:bg-white/15 hover:text-white transition-all text-white/70"
          title="Cursiva"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd('underline');
          }}
          className="p-1.5 rounded-lg hover:bg-white/15 hover:text-white transition-all text-white/70"
          title="Subrayado"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd('strikeThrough');
          }}
          className="p-1.5 rounded-lg hover:bg-white/15 hover:text-white transition-all text-white/70"
          title="Tachado"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

        {/* Bullet List */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleBulletList();
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/15 hover:text-white transition-all text-[11px] text-white/70"
          title="Lista con viñetas"
        >
          <List className="w-3.5 h-3.5" />
          <span>Lista</span>
        </button>

        {/* Checklist / Task */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleChecklist();
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/15 hover:text-white transition-all text-[11px] text-white/70"
          title="Casilla de verificación / Tarea"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Tarea</span>
        </button>
      </div>

      {/* Direct WYSIWYG Editable Area with Visual Styling */}
      <div className="relative flex-1 flex flex-col min-h-0">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onKeyDown={handleKeyDown}
          style={{ minHeight }}
          className="w-full flex-1 p-3.5 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-xl text-xs text-white placeholder-white/40 focus:outline-hidden focus:border-[#FF688B] overflow-y-auto leading-relaxed font-medium select-text cursor-text"
        />

        {/* Placeholder shown only when completely empty */}
        {isEmpty && (
          <div
            onClick={() => editorRef.current?.focus()}
            className="absolute top-3.5 left-3.5 text-white/35 text-xs pointer-events-none select-none font-medium"
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
};

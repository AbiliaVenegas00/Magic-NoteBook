import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building2, Palette } from 'lucide-react';
import { CRMContact } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: CRMContact | null; // null for new contact
  onSaveContact: (contactData: Omit<CRMContact, 'id'>, contactId?: string) => void;
}

const COLOR_OPTIONS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  isOpen,
  onClose,
  contact,
  onSaveContact,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<CRMContact['relationship']>('academic');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setRole(contact.role);
      setOrganization(contact.organization || '');
      setEmail(contact.email || '');
      setPhone(contact.phone || '');
      setRelationship(contact.relationship);
      setNotes(contact.notes || '');
      setColor(contact.color || COLOR_OPTIONS[0]);
    } else {
      setName('');
      setRole('');
      setOrganization('');
      setEmail('');
      setPhone('');
      setRelationship('academic');
      setNotes('');
      setColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
    }
  }, [contact, isOpen]);

  if (!isOpen) return null;

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveContact(
      {
        name: name.trim(),
        role: role.trim() || 'Collaborator',
        organization: organization.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        relationship,
        notes: notes.trim() || undefined,
        color,
        avatarInitials: getInitials(name),
        lastContactDate: contact?.lastContactDate || getTodayDateString(),
      },
      contact?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#13151b] rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-100">
              {contact ? 'Edit CRM Stakeholder' : 'Add Personal CRM Contact'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Avatar Preview & Name */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm shrink-0 border border-white/10"
              style={{
                backgroundColor: `${color}25`,
                color: color,
              }}
            >
              {getInitials(name || 'New Contact')}
            </div>

            <div className="flex-1">
              <label className="block font-medium text-zinc-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Arthur Pendelton"
                className="w-full px-3 py-2 bg-[#181a23] border border-zinc-800 rounded-xl text-xs font-medium text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>

          {/* Role & Org */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-400 mb-1">
                Role / Title *
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Professor, Lead"
                className="w-full px-3 py-2 bg-[#181a23] border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-400 mb-1">
                Organization / Dept
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Dept of CS"
                className="w-full px-3 py-2 bg-[#181a23] border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>

          {/* Relationship Tag */}
          <div>
            <label className="block font-medium text-zinc-400 mb-1">
              Relationship Type
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as CRMContact['relationship'])}
              className="w-full px-3 py-2 bg-[#181a23] border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
            >
              <option value="academic">Academic (Professor / Faculty / Lab)</option>
              <option value="work">Work / Professional (Manager / Teammate)</option>
              <option value="client">Client / External Partner</option>
              <option value="mentor">Mentor / Advisor</option>
              <option value="personal">Personal / Life</option>
            </select>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@org.edu"
                className="w-full px-3 py-2 bg-[#181a23] border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-400 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555..."
                className="w-full px-3 py-2 bg-[#181a23] border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="block font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-zinc-500" />
              <span>Contact Badge Color</span>
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-zinc-300 ring-offset-2 ring-offset-[#13151b]' : 'hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-zinc-400 mb-1">
              Private Notes &amp; Preferences
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prefers Friday email updates. Expects weekly draft proofs."
              className="w-full px-3 py-2 bg-[#181a23] border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-900 rounded-xl hover:bg-zinc-200 transition-colors shadow-xs"
            >
              Save Contact
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  UserPlus, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  AlertCircle,
  Sparkles,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { CRMContact, AssignmentTask } from '../types';
import { formatHumanDate, getTodayDateString } from '../utils/dateUtils';
import { PRIORITY_CONFIG } from '../utils/themeHelpers';

interface PersonalCrmViewProps {
  contacts: CRMContact[];
  tasks: AssignmentTask[];
  onSelectTask: (task: AssignmentTask) => void;
  onToggleTaskComplete: (taskId: string, e: React.MouseEvent) => void;
  onOpenCreateTaskWithContact: (contactId: string) => void;
  onOpenCreateContact: () => void;
  onOpenEditContact: (contact: CRMContact) => void;
  onDeleteContact: (contactId: string) => void;
}

export const PersonalCrmView: React.FC<PersonalCrmViewProps> = ({
  contacts,
  tasks,
  onSelectTask,
  onToggleTaskComplete,
  onOpenCreateTaskWithContact,
  onOpenCreateContact,
  onOpenEditContact,
  onDeleteContact,
}) => {
  const [selectedContactId, setSelectedContactId] = useState<string>(contacts[0]?.id || '');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');

  const filteredContacts = contacts.filter((c) => {
    if (relationshipFilter === 'all') return true;
    return c.relationship === relationshipFilter;
  });

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || filteredContacts[0];

  // Tasks associated with the selected contact
  const contactTasks = selectedContact
    ? tasks.filter((t) => t.contactId === selectedContact.id)
    : [];

  const activeContactTasks = contactTasks.filter((t) => t.status !== 'completed');
  const completedContactTasks = contactTasks.filter((t) => t.status === 'completed');
  const totalCommittedMinutes = activeContactTasks.reduce((acc, t) => acc + t.durationMinutes, 0);

  return (
    <div className="space-y-4" id="personal-crm-view">
      
      {/* Top Banner */}
      <div className="bg-[#13151b] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span>Personal CRM &amp; Relationship Stakeholders</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-400/20">
              {contacts.length} Contacts
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Tie your assignments, deadlines, follow-ups, and calendar plans directly to the people who matter.
          </p>
        </div>

        <button
          onClick={onOpenCreateContact}
          className="px-3.5 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-900 rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Main 2-Column CRM Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col (4/12): Contact Directory List */}
        <div className="lg:col-span-4 space-y-3">
          {/* Relationship Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {['all', 'academic', 'work', 'mentor', 'client'].map((rel) => (
              <button
                key={rel}
                onClick={() => setRelationshipFilter(rel)}
                className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap text-xs transition-colors ${
                  relationshipFilter === rel
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'bg-[#13151b] border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                {rel}
              </button>
            ))}
          </div>

          {/* Directory Cards */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto">
            {filteredContacts.map((c) => {
              const countActive = tasks.filter((t) => t.contactId === c.id && t.status !== 'completed').length;
              const isSelected = selectedContact?.id === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedContactId(c.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-[#1a1d28] border-indigo-400/50 shadow-xs ring-1 ring-indigo-400/40'
                      : 'bg-[#13151b] border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                  }`}
                >
                  {/* Contact Avatar Initials */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs shrink-0 border border-white/10"
                    style={{
                      backgroundColor: `${c.color}25`,
                      color: c.color,
                    }}
                  >
                    {c.avatarInitials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-medium text-zinc-100 truncate">
                        {c.name}
                      </h4>
                      <span className="text-[9px] uppercase font-medium px-1.5 py-0.5 rounded-sm bg-zinc-800/80 text-zinc-400">
                        {c.relationship}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {c.role}
                    </p>

                    <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
                      <span>{c.organization || 'Independent'}</span>
                      {countActive > 0 ? (
                        <span className="font-medium text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded-sm border border-indigo-400/20">
                          {countActive} active {countActive === 1 ? 'task' : 'tasks'}
                        </span>
                      ) : (
                        <span>No active tasks</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col (8/12): Detailed Contact Profile & Linked Assignments */}
        <div className="lg:col-span-8">
          {selectedContact ? (
            <div className="bg-[#13151b] border border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-5">
              
              {/* Contact Header Profile */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-zinc-800/80">
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm shrink-0 border border-white/10"
                    style={{
                      backgroundColor: `${selectedContact.color}25`,
                      color: selectedContact.color,
                    }}
                  >
                    {selectedContact.avatarInitials}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-100">
                        {selectedContact.name}
                      </h3>
                      <span className="text-[10px] uppercase font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                        {selectedContact.relationship}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 font-normal mt-0.5">
                      {selectedContact.role} • <span className="text-zinc-500">{selectedContact.organization}</span>
                    </p>

                    {/* Contact details */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-400">
                      {selectedContact.email && (
                        <a
                          href={`mailto:${selectedContact.email}`}
                          className="flex items-center gap-1 hover:text-indigo-300 transition-colors"
                        >
                          <Mail className="w-3 h-3 text-zinc-500" />
                          <span>{selectedContact.email}</span>
                        </a>
                      )}
                      {selectedContact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-500" />
                          <span>{selectedContact.phone}</span>
                        </span>
                      )}
                      {selectedContact.lastContactDate && (
                        <span className="text-zinc-500 text-[11px]">
                          Last interacted: {formatHumanDate(selectedContact.lastContactDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenCreateTaskWithContact(selectedContact.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Plan Task</span>
                  </button>

                  <button
                    onClick={() => onOpenEditContact(selectedContact)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Edit Contact Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Remove ${selectedContact.name} from Personal CRM?`)) {
                        onDeleteContact(selectedContact.id);
                      }
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Private Stakeholder Notes */}
              {selectedContact.notes && (
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-xs">
                  <div className="font-medium text-zinc-300 mb-1 flex items-center gap-1.5 text-[11px]">
                    <MessageSquare className="w-3 h-3 text-zinc-500" />
                    <span>Stakeholder Notes &amp; Engagement Preferences</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    {selectedContact.notes}
                  </p>
                </div>
              )}

              {/* CRM Workload Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/80">
                  <span className="text-base font-semibold text-zinc-100">{activeContactTasks.length}</span>
                  <p className="text-[10px] text-zinc-500 font-medium">Active Plans</p>
                </div>
                <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/80">
                  <span className="text-base font-semibold text-zinc-100">{(totalCommittedMinutes / 60).toFixed(1)}h</span>
                  <p className="text-[10px] text-zinc-500 font-medium">Committed Effort</p>
                </div>
                <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/80">
                  <span className="text-base font-semibold text-emerald-300">{completedContactTasks.length}</span>
                  <p className="text-[10px] text-zinc-500 font-medium">Completed</p>
                </div>
              </div>

              {/* Linked Assignments List */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Linked Calendar Assignments &amp; Tasks
                  </h4>
                  <button
                    onClick={() => onOpenCreateTaskWithContact(selectedContact.id)}
                    className="text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
                  >
                    + Schedule with {selectedContact.name.split(' ')[0]}
                  </button>
                </div>

                {contactTasks.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500">
                    No assignments or calendar dates linked with {selectedContact.name} yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contactTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      const priority = PRIORITY_CONFIG[task.priority];

                      return (
                        <div
                          key={task.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            isDone ? 'bg-zinc-900/60 border-zinc-800/50 text-zinc-500' : 'bg-[#181a23] border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={(e) => onToggleTaskComplete(task.id, e)}
                              className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                                isDone
                                  ? 'bg-emerald-500/80 border-emerald-400 text-zinc-950'
                                  : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/60'
                              }`}
                            >
                              {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>

                            <div className="flex-1 cursor-pointer" onClick={() => onSelectTask(task)}>
                              <p className={`text-xs font-medium ${isDone ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                                <span>Due: {formatHumanDate(task.dueDate)}</span>
                                {task.dueTime && <span>at {task.dueTime}</span>}
                                <span>• {task.durationMinutes}m</span>
                              </div>
                            </div>
                          </div>

                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-sm border uppercase ${priority.badgeClass}`}>
                            {priority.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-[#13151b] border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-500 text-xs">
              Select or add a contact from the CRM directory.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

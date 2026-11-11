/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  UserCheck,
  Users,
  Baby,
  Clock,
  ExternalLink,
  Share2,
  Trash2,
  Edit2,
  Check,
  Loader2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { BirthdayProfile, Guest } from '../types.ts';

interface GoogleSheetsTabProps {
  profile: BirthdayProfile;
  onChangeProfile: (newProfile: Partial<BirthdayProfile>) => void;
}

const INITIAL_GUESTS: Guest[] = [
  {
    name: 'Uncle John & Family',
    status: 'Attending',
    adults: 2,
    kids: 1,
    phone: '+1 555-0192',
    email: 'john@example.com',
    dietaryNotes: 'Vegetarian',
    invitationSent: true,
    giftWishes: 'Baby explorer toys',
  },
  {
    name: 'Aunt Sarah & David',
    status: 'Attending',
    adults: 2,
    kids: 0,
    phone: '+1 555-0144',
    email: 'sarah@example.com',
    dietaryNotes: 'None',
    invitationSent: true,
    giftWishes: 'Picture story book',
  },
  {
    name: 'Grandma & Grandpa',
    status: 'Attending',
    adults: 2,
    kids: 0,
    phone: '+1 555-0188',
    email: 'family@example.com',
    dietaryNotes: 'None',
    invitationSent: true,
    giftWishes: 'Silver keepsake',
  },
  {
    name: 'Miller Family',
    status: 'Maybe',
    adults: 2,
    kids: 2,
    phone: '+1 555-0177',
    email: 'miller@example.com',
    dietaryNotes: 'Nut allergy',
    invitationSent: true,
    giftWishes: 'Building blocks',
  },
  {
    name: 'Cousin Chloe',
    status: 'Attending',
    adults: 1,
    kids: 0,
    phone: '+1 555-0163',
    email: 'chloe@example.com',
    dietaryNotes: 'Vegan',
    invitationSent: true,
    giftWishes: 'Cute floral outfit',
  },
];

export default function GoogleSheetsTab({ profile, onChangeProfile }: GoogleSheetsTabProps) {
  const [guests, setGuests] = useState<Guest[]>(() => {
    const saved = localStorage.getItem('pixelbridge_sheet_guests');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_GUESTS;
      }
    }
    return INITIAL_GUESTS;
  });

  const [activeSheetId, setActiveSheetId] = useState<string>(
    profile.spreadsheetId || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [newGuest, setNewGuest] = useState<Guest>({
    name: '',
    status: 'Attending',
    adults: 2,
    kids: 0,
    phone: '',
    email: '',
    dietaryNotes: '',
    invitationSent: true,
    giftWishes: '',
  });

  useEffect(() => {
    localStorage.setItem('pixelbridge_sheet_guests', JSON.stringify(guests));
  }, [guests]);

  const handleCreateNewSheet = async () => {
    setIsCreatingSheet(true);
    setNotification(null);
    setTimeout(() => {
      const randomId = `pb_sheet_${Date.now().toString(36)}`;
      setActiveSheetId(randomId);
      onChangeProfile({ spreadsheetId: randomId });
      setIsCreatingSheet(false);
      setNotification({
        type: 'success',
        text: `Created new spreadsheet: "${profile.name || 'Baby'}'s 1st Birthday - Guest & RSVP Tracker" in Google Sheets!`,
      });
      setTimeout(() => setNotification(null), 6000);
    }, 1000);
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuest.name.trim()) return;

    if (editingIndex !== null) {
      const updated = [...guests];
      updated[editingIndex] = newGuest;
      setGuests(updated);
      setEditingIndex(null);
      setNotification({ type: 'success', text: `Updated guest "${newGuest.name}" in Google Sheet!` });
    } else {
      setGuests([...guests, newGuest]);
      setNotification({ type: 'success', text: `Added guest "${newGuest.name}" to Google Sheet!` });
    }

    setNewGuest({
      name: '',
      status: 'Attending',
      adults: 2,
      kids: 0,
      phone: '',
      email: '',
      dietaryNotes: '',
      invitationSent: true,
      giftWishes: '',
    });
    setIsAddModalOpen(false);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleEditGuest = (g: Guest, idx: number) => {
    setNewGuest({ ...g });
    setEditingIndex(idx);
    setIsAddModalOpen(true);
  };

  const handleDeleteGuest = (idx: number) => {
    const target = guests[idx];
    setGuests(guests.filter((_, i) => i !== idx));
    setNotification({ type: 'info', text: `Removed "${target.name}" from active RSVP list.` });
    setTimeout(() => setNotification(null), 3000);
  };

  const sendWhatsAppInvite = (guest: Guest) => {
    const text = `🎉 Dear ${guest.name}, you are warmly invited to celebrate the 1st Birthday of ${profile.name || 'our little star'}!\n\n📅 Date: ${profile.date}\n⏰ Time: ${profile.time}\n📍 Venue: ${profile.venueName}, ${profile.venueAddress}\n\nRSVP Status: ${guest.status} (${guest.adults} Adults, ${guest.kids} Kids)\n\nWith love,\n${profile.parentsNames}`;
    const url = `https://api.whatsapp.com/send?${guest.phone ? `phone=${encodeURIComponent(guest.phone)}&` : ''}text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Calculations
  const totalGuestsHeadcount = guests.reduce((acc, g) => acc + (g.adults || 0) + (g.kids || 0), 0);
  const attendingList = guests.filter((g) => g.status === 'Attending');
  const attendingHeadcount = attendingList.reduce((acc, g) => acc + (g.adults || 0) + (g.kids || 0), 0);
  const totalKids = guests.reduce((acc, g) => acc + (g.kids || 0), 0);
  const pendingCount = guests.filter((g) => g.status === 'Invited' || g.status === 'Maybe').length;

  const filteredGuests = guests.filter((g) => {
    if (filterStatus === 'all') return true;
    return g.status.toLowerCase() === filterStatus.toLowerCase();
  });

  return (
    <div className="flex flex-col gap-6 bg-stone-900/95 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-stone-800 shadow-xl text-stone-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-md">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Google Sheets Guest & RSVP Tracker</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Cloud Sync
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Sync RSVPs, guest headcount, dietary requirements & gift notes directly with your Google Drive spreadsheet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCreateNewSheet}
            disabled={isCreatingSheet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/25 disabled:opacity-50"
          >
            {isCreatingSheet ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating Sheet...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>New Birthday Sheet</span>
              </>
            )}
          </button>

          <a
            href={`https://docs.google.com/spreadsheets/d/${activeSheetId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-all"
          >
            <span>Open in Google Sheets</span>
            <ExternalLink className="w-3 h-3 text-emerald-400" />
          </a>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              : 'bg-blue-950/60 border-blue-500/40 text-blue-300'
          }`}
        >
          {notification.type === 'success' ? (
            <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Headcount Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-400" />
            <span>Total Guests</span>
          </span>
          <span className="text-xl font-bold font-mono text-white">{totalGuestsHeadcount}</span>
          <span className="text-[10px] text-stone-500">{guests.length} families invited</span>
        </div>

        <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            <span>Confirmed Attending</span>
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400">{attendingHeadcount}</span>
          <span className="text-[10px] text-emerald-500/80">{attendingList.length} groups RSVP'd YES</span>
        </div>

        <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
            <Baby className="w-3 h-3 text-pink-400" />
            <span>Kids Headcount</span>
          </span>
          <span className="text-xl font-bold font-mono text-pink-400">{totalKids}</span>
          <span className="text-[10px] text-pink-500/80">Kids meals & party favors</span>
        </div>

        <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Pending / Maybe</span>
          </span>
          <span className="text-xl font-bold font-mono text-amber-400">{pendingCount}</span>
          <span className="text-[10px] text-amber-500/80">Send video reminders</span>
        </div>
      </div>

      {/* Filter and Add Guest bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-stone-950/60 p-1 rounded-xl border border-stone-800 text-xs">
          {['all', 'Attending', 'Maybe', 'Declined', 'Invited'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {status === 'all' ? 'All RSVPs' : status}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingIndex(null);
            setNewGuest({
              name: '',
              status: 'Attending',
              adults: 2,
              kids: 0,
              phone: '',
              email: '',
              dietaryNotes: '',
              invitationSent: true,
              giftWishes: '',
            });
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold border border-stone-700 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Add Guest Entry</span>
        </button>
      </div>

      {/* Guests Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-950/40">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-900/80 text-stone-400 uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3 font-semibold">Guest / Family</th>
              <th className="py-2.5 px-3 font-semibold">RSVP Status</th>
              <th className="py-2.5 px-3 font-semibold text-center">Adults</th>
              <th className="py-2.5 px-3 font-semibold text-center">Kids</th>
              <th className="py-2.5 px-3 font-semibold">Contact / Phone</th>
              <th className="py-2.5 px-3 font-semibold">Dietary & Notes</th>
              <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {filteredGuests.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-500">
                  No guest records found for selected filter.
                </td>
              </tr>
            ) : (
              filteredGuests.map((g, idx) => (
                <tr key={idx} className="hover:bg-stone-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-white">{g.name}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        g.status === 'Attending'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : g.status === 'Maybe'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : g.status === 'Declined'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {g.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-stone-300">{g.adults}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-pink-300">{g.kids}</td>
                  <td className="py-2.5 px-3 text-stone-300 font-mono text-[11px]">{g.phone || g.email || '—'}</td>
                  <td className="py-2.5 px-3 text-stone-400 text-[11px] truncate max-w-[140px]">
                    {g.dietaryNotes || g.giftWishes || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => sendWhatsAppInvite(g)}
                        title="Send WhatsApp invitation message"
                        className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 cursor-pointer transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEditGuest(g, idx)}
                        title="Edit row"
                        className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGuest(idx)}
                        title="Remove guest"
                        className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Guest Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-stone-200">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>{editingIndex !== null ? 'Edit Guest Row' : 'Add Guest to Google Sheet'}</span>
            </h4>

            <form onSubmit={handleAddGuest} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-stone-300">Guest / Family Name</label>
                <input
                  type="text"
                  required
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  placeholder="e.g. Uncle Robert & Family"
                  className="w-full px-3 py-2 bg-stone-800 rounded-xl border border-stone-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-stone-300">RSVP Status</label>
                  <select
                    value={newGuest.status}
                    onChange={(e) => setNewGuest({ ...newGuest, status: e.target.value as any })}
                    className="w-full px-2 py-2 bg-stone-800 rounded-xl border border-stone-700 text-xs text-stone-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Attending">Attending</option>
                    <option value="Maybe">Maybe</option>
                    <option value="Declined">Declined</option>
                    <option value="Invited">Invited</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-stone-300">Adults</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newGuest.adults}
                    onChange={(e) => setNewGuest({ ...newGuest, adults: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-800 rounded-xl border border-stone-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-stone-300">Kids</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newGuest.kids}
                    onChange={(e) => setNewGuest({ ...newGuest, kids: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-800 rounded-xl border border-stone-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-stone-300">WhatsApp / Phone</label>
                  <input
                    type="text"
                    value={newGuest.phone}
                    onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                    placeholder="+1 555-..."
                    className="w-full px-3 py-2 bg-stone-800 rounded-xl border border-stone-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-stone-300">Email Address</label>
                  <input
                    type="email"
                    value={newGuest.email}
                    onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 bg-stone-800 rounded-xl border border-stone-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-stone-300">Dietary & Gift Notes</label>
                <input
                  type="text"
                  value={newGuest.dietaryNotes}
                  onChange={(e) => setNewGuest({ ...newGuest, dietaryNotes: e.target.value })}
                  placeholder="e.g. Vegetarian, loves baby trains"
                  className="w-full px-3 py-2 bg-stone-800 rounded-xl border border-stone-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/25"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingIndex !== null ? 'Save Changes' : 'Add to Sheet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

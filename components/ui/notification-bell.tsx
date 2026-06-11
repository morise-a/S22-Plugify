'use client';

import * as React from 'react';
import { Bell, CheckCheck, Package, AlertTriangle, Info, X } from 'lucide-react';
import { getNotificationsAction, markNotificationReadAction, markAllNotificationsReadAction } from '../../app/actions/notifications';
import type { Notification } from '../../app/actions/notifications';

interface NotificationBellProps {
  /** 'admin' uses indigo-slate styling; 'customer' uses the app primary theme */
  variant?: 'admin' | 'customer';
  /** Where to align the dropdown relative to the bell button. Defaults to 'right' */
  align?: 'left' | 'right';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getNotifIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('confirm') || t.includes('success') || t.includes('payment'))
    return <Package className="h-4 w-4 text-emerald-400" />;
  if (t.includes('fail') || t.includes('decline') || t.includes('error'))
    return <AlertTriangle className="h-4 w-4 text-red-400" />;
  return <Info className="h-4 w-4 text-indigo-400" />;
}

export function NotificationBell({ variant = 'customer', align = 'right' }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotificationsAction();
      setNotifications(res.notifications);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount & when panel opens
  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  React.useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await markNotificationReadAction(id);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsReadAction();
    setMarkingAll(false);
  };

  const isAdmin = variant === 'admin';

  const bellClass = isAdmin
    ? 'relative p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 cursor-pointer focus:outline-none'
    : 'relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all duration-200 cursor-pointer focus:outline-none';

  const badgeBg = isAdmin ? 'bg-indigo-600' : 'bg-primary';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        type="button"
        className={bellClass}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className={`h-5 w-5 transition-transform duration-200 ${open ? 'scale-110' : ''}`} />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full ${badgeBg} text-[9px] font-bold text-white px-1 animate-pulse shadow-lg`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className={`absolute mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-[9999] overflow-hidden ${
            align === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
          } ${
            isAdmin
              ? 'bg-white border-slate-200 shadow-slate-200/60'
              : 'bg-card/95 backdrop-blur-xl border-border/60 shadow-black/20'
          }`}
          style={{ animation: 'notifSlideIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${
              isAdmin
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-700/30'
                : 'bg-gradient-to-r from-primary/90 to-purple-600/90 border-primary/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-white/90" />
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-[10px] font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-all cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer ml-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className={`h-5 w-5 rounded-full border-2 border-t-transparent animate-spin ${isAdmin ? 'border-indigo-500' : 'border-primary'}`} />
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground font-medium">No notifications yet</p>
              </div>
            )}
            {!loading &&
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`group flex items-start gap-3 px-4 py-3 transition-colors cursor-default ${
                    notif.read
                      ? isAdmin
                        ? 'bg-white hover:bg-slate-50/60'
                        : 'bg-transparent hover:bg-secondary/20'
                      : isAdmin
                      ? 'bg-indigo-50/60 hover:bg-indigo-50'
                      : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center ${
                      notif.read
                        ? 'bg-muted/40'
                        : isAdmin
                        ? 'bg-indigo-100'
                        : 'bg-primary/10'
                    }`}
                  >
                    {getNotifIcon(notif.title)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          notif.read
                            ? 'text-muted-foreground'
                            : isAdmin
                            ? 'text-slate-900'
                            : 'text-foreground'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                  </div>

                  {/* Mark read dot */}
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      className={`flex-shrink-0 mt-1 h-2 w-2 rounded-full cursor-pointer transition-all hover:scale-125 ${
                        isAdmin ? 'bg-indigo-500' : 'bg-primary'
                      }`}
                      title="Mark as read"
                    />
                  )}
                </div>
              ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className={`px-4 py-2.5 border-t text-center ${
                isAdmin ? 'bg-slate-50/80 border-slate-200/60' : 'bg-secondary/20 border-border/30'
              }`}
            >
              <p className="text-[10px] text-muted-foreground">
                Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}

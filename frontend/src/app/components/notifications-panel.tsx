import { useState, useEffect } from "react";
import { Bell, X, Check, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { notificationAPI, type Notification } from "@/api/features";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToReviews?: () => void;
}

export function NotificationsPanel({ isOpen, onClose, onNavigateToReviews }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationAPI.getNotifications();
      setNotifications(data.notifications);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    
    // If it's a baker reply notification, navigate to reviews
    if (notification.title.includes('replied to your review') && onNavigateToReviews) {
      onClose();
      onNavigateToReviews();
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(
        notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-white shadow-2xl z-50 flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="p-6 border-b border-[#D35400]/10 bg-gradient-to-r from-[#FFE5D9] to-[#FFD4C1]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg">
                <Bell className="w-6 h-6 text-[#D35400]" />
              </div>
              <h2 className="text-2xl text-[#4E342E]">Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-[#4E342E]" />
            </button>
          </div>
          
          {unreadCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4E342E]/70">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-[#D35400] hover:underline flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Mark all as read
              </button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#D35400] border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-[#FFF9F5] rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-[#D35400]/30" />
              </div>
              <p className="text-[#4E342E]/70">No notifications yet</p>
              <p className="text-sm text-[#4E342E]/50 mt-2">
                We'll notify you about orders and updates
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer stagger-item ${
                    notification.read
                      ? 'bg-white border-gray-200'
                      : `${getColor(notification.type)} border-2`
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`font-medium ${notification.read ? 'text-[#4E342E]/70' : 'text-[#4E342E]'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-[#D35400] rounded-full flex-shrink-0 mt-1.5"></div>
                        )}
                      </div>
                      <p className={`text-sm ${notification.read ? 'text-[#4E342E]/50' : 'text-[#4E342E]/70'} whitespace-pre-wrap`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#4E342E]/40 mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-[#D35400]/10 bg-[#FFF9F5]">
            <p className="text-center text-sm text-[#4E342E]/60">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Notification Bell Button Component
interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    startPolling();
  }, []);

  const startPolling = () => {
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  };

  const loadUnreadCount = async () => {
    try {
      const data = await notificationAPI.getUnreadCount();
      setUnreadCount(data.count);
    } catch (error) {
      // Silently fail
    }
  };

  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-[#FFF9F5] rounded-lg transition-colors"
    >
      <Bell className="w-6 h-6 text-[#4E342E]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#D35400] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

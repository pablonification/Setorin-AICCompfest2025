import { FiCheck, FiTrash2 } from 'react-icons/fi';

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete
}) {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'bin_status':
        return '🗑️';
      case 'achievement':
        return '🏆';
      case 'reward':
        return '🎁';
      case 'system':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 3:
        return 'border-l-[var(--color-danger)]';
      case 2:
        return 'border-l-[var(--color-accent-amber)]';
      case 1:
        return 'border-l-[var(--color-success)]';
      default:
        return 'border-l-[var(--color-muted)]';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 3:
        return 'Tinggi';
      case 2:
        return 'Sedang';
      case 1:
        return 'Rendah';
      default:
        return 'Normal';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Baru saja';
    } else if (diffInHours < 24) {
      return `${diffInHours} jam yang lalu`;
    } else {
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  return (
    <div
      className={`bg-[var(--color-card)] rounded-[var(--radius-md)] border-l-4 ${getPriorityColor(notification.priority)} ${!notification.is_read ? 'border border-blue-200 bg-blue-50/50' : 'border border-gray-200'
        } transition-all hover:shadow-[var(--shadow-card)]`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <span className="text-2xl">{getNotificationIcon(notification.notification_type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm leading-5 font-semibold text-[var(--foreground)]">
                  {notification.title}
                </h4>
                {!notification.is_read && (
                  <span className="bg-[var(--color-primary-600)] text-white px-2 py-1 rounded-[var(--radius-pill)] text-xs leading-4">
                    Baru
                  </span>
                )}
              </div>

              <p className="text-sm leading-5 text-[var(--color-muted)] mb-2">
                {notification.message}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs leading-4 text-[var(--color-muted)]">
                  <span>{formatDate(notification.created_at)}</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-[var(--radius-sm)]">
                    {getPriorityText(notification.priority)}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {!notification.is_read && (
                    <button
                      onClick={() => onMarkAsRead(notification.id)}
                      className="p-2 text-[var(--color-success)] hover:bg-green-50 rounded-[var(--radius-sm)] transition-colors"
                      aria-label="Tandai sudah dibaca"
                    >
                      <FiCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(notification.id)}
                    className="p-2 text-[var(--color-danger)] hover:bg-red-50 rounded-[var(--radius-sm)] transition-colors"
                    aria-label="Hapus notifikasi"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

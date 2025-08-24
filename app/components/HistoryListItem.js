"use client";

export default function HistoryListItem({ transaction }) {
  const { id, icon, title, time, amount, points } = transaction;

  // Format amount as currency with sign
  const formatAmount = (value) => {
    const sign = value >= 0 ? "+" : "-";
    const absValue = Math.abs(value);
    return `${sign} Rp ${absValue.toLocaleString('id-ID')}`;
  };

  // Format points with sign and suffix
  const formatPoints = (value) => {
    const sign = value >= 0 ? "+" : "-";
    const absValue = Math.abs(value);
    return `${sign}${absValue} pts`;
  };

  // Determine colors based on values
  const amountColor = amount >= 0 ? 'text-[color:var(--color-success)]' : 'text-[color:var(--color-danger)]';
  const pointsColor = points >= 0 ? 'text-[color:var(--color-success)]' : 'text-[color:var(--color-danger)]';

  return (
    <div className="flex items-center justify-between py-3">
      {/* Left: Icon */}
      <div className="shrink-0">
        {icon}
      </div>

      {/* Middle: Title and Time */}
      <div className="flex-1 min-w-0 px-4">
        <div className="text-sm leading-5 font-medium truncate">
          {title}
        </div>
        <div className="text-xs leading-4 text-[color:var(--color-muted)]">
          {time}
        </div>
      </div>

      {/* Right: Amount and Points */}
      <div className="text-right">
        <div className={`text-sm leading-5 font-semibold ${amountColor}`}>
          {formatAmount(amount)}
        </div>
      </div>
    </div>
  );
}

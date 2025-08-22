'use client';

export default function StatisticsCard({ stats }) {
  return (
    <div className="rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] bg-white p-4">
      <div className="text-[14px] leading-5 font-semibold text-[var(--color-primary-700)] mb-4">
        Statistik
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {/* Total Setoran */}
        <div className="flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center mb-2">
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--color-primary-600)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5Z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="text-[14px] leading-5 font-semibold text-[var(--color-primary-700)] mb-1">
            {stats?.totalDeposits || '0 kg'}
          </div>
          <div className="text-[12px] leading-4 text-[var(--color-muted)]">
            Total Setoran
          </div>
        </div>
        
        {/* Poin Saya */}
        <div className="flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-[var(--color-accent-amber)] bg-opacity-20 flex items-center justify-center mb-2">
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--color-accent-amber)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <path d="M16 8s-1.5-2-4-2-4 2-4 2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
              <path d="M9 15c.309.468.787.823 1.5 1.5 1.5 1.5 3 2.5 3 2.5s1.5-1 3-2.5c.713-.677 1.191-1.032 1.5-1.5"/>
            </svg>
          </div>
          <div className="text-[14px] leading-5 font-semibold text-[var(--color-primary-700)] mb-1">
            {stats?.points || '0'}
          </div>
          <div className="text-[12px] leading-4 text-[var(--color-muted)]">
            Poin Saya
          </div>
        </div>
        
        {/* Total Penarikan */}
        <div className="flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-[var(--color-success)] bg-opacity-20 flex items-center justify-center mb-2">
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--color-success)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="text-[14px] leading-5 font-semibold text-[var(--color-primary-700)] mb-1">
            {stats?.totalWithdrawals || 'Rp 0'}
          </div>
          <div className="text-[12px] leading-4 text-[var(--color-muted)]">
            Total Penarikan
          </div>
        </div>
      </div>
    </div>
  );
}

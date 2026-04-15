export const MOCK_USER = {
  id: 'local-dev-user',
  email: 'user@local.setorin',
  name: 'Local User',
  photo_url: '/profile/default-profile.jpg',
  points: 34250,
  role: 'user',
  tier: 'Penjelajah',
  phone: '081234567890',
  city: 'Jakarta',
  gender: 'Rahasia',
};

export const MOCK_TRANSACTIONS = [
  {
    id: 'txn-001',
    brand: 'AQUA',
    valid: true,
    points: 3500,
    timestamp: '2026-04-14T10:15:00+07:00',
    created_at: '2026-04-14T10:15:00+07:00',
  },
  {
    id: 'txn-002',
    brand: 'Le Minerale',
    valid: true,
    points: 2800,
    timestamp: '2026-04-13T16:42:00+07:00',
    created_at: '2026-04-13T16:42:00+07:00',
  },
  {
    id: 'txn-003',
    brand: 'Cleo',
    valid: false,
    points: 0,
    timestamp: '2026-04-12T13:10:00+07:00',
    created_at: '2026-04-12T13:10:00+07:00',
  },
  {
    id: 'txn-004',
    brand: 'AQUA',
    valid: true,
    points: 4200,
    timestamp: '2026-04-11T09:05:00+07:00',
    created_at: '2026-04-11T09:05:00+07:00',
  },
  {
    id: 'txn-005',
    brand: 'Ades',
    valid: true,
    points: 3100,
    timestamp: '2026-04-09T18:30:00+07:00',
    created_at: '2026-04-09T18:30:00+07:00',
  },
];

export const MOCK_WITHDRAWALS = [
  {
    id: 'wd-001',
    amount_points: 20000,
    status: 'completed',
    created_at: '2026-04-05T14:00:00+07:00',
  },
  {
    id: 'wd-002',
    amount_points: 10000,
    status: 'pending',
    created_at: '2026-04-15T11:20:00+07:00',
  },
];

export const MOCK_PAYOUT_METHOD = {
  id: 'pm-001',
  method_type: 'ewallet',
  ewallet_provider: 'OVO',
  phone_number: '081234567890',
};

export const MOCK_PAYOUT_METADATA = {
  banks: ['BCA', 'BNI', 'BRI', 'MANDIRI'],
  ewallets: ['OVO', 'GOPAY', 'DANA', 'SHOPEEPAY'],
  min_withdrawal_points: 20000,
};

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    title: 'Setoran berhasil',
    message: 'Botol AQUA kamu berhasil divalidasi dan menambah 3.500 poin.',
    notification_type: 'reward',
    priority: 1,
    is_read: false,
    created_at: '2026-04-15T10:30:00+07:00',
  },
  {
    id: 'notif-002',
    title: 'Target mingguan tercapai',
    message: 'Kamu sudah menyetor 12 botol minggu ini. Pertahankan.',
    notification_type: 'achievement',
    priority: 2,
    is_read: false,
    created_at: '2026-04-14T08:10:00+07:00',
  },
  {
    id: 'notif-003',
    title: 'Pencairan diproses',
    message: 'Pengajuan pencairan 10.000 poin sedang ditinjau admin.',
    notification_type: 'system',
    priority: 1,
    is_read: true,
    created_at: '2026-04-13T19:40:00+07:00',
  },
];

export const MOCK_NOTIFICATION_SETTINGS = {
  email_notifications: true,
  push_notifications: true,
  bin_status_notifications: false,
  achievement_notifications: true,
  reward_notifications: true,
  system_notifications: true,
  quiet_hours_start: 22,
  quiet_hours_end: 7,
};

export const MOCK_PERSONAL_STATS = {
  total_bottles: 48,
  total_points: 34250,
  total_scans: 53,
  bottles_this_month: 17,
  points_this_month: 12600,
  plastic_waste_diverted_kg: 8.45,
  co2_emissions_saved_kg: 12.7,
  current_streak_days: 6,
  longest_streak_days: 14,
  last_scan_date: '2026-04-14T10:15:00+07:00',
  last_reward_date: '2026-04-14T10:15:00+07:00',
  user_tier: 'Penjelajah',
  environmental_impact: {
    bottles_equivalent: 'Setara 48 botol plastik terselamatkan dari TPA',
    trees_equivalent: 'Setara kontribusi 1 pohon muda dalam 3 bulan',
  },
};

export const MOCK_LEADERBOARD = {
  user_rank: 4,
  total_participants: 128,
  rankings: [
    { user_id: 'user-001', rank: 1, name: 'Nadya', total_bottles: 96, total_points: 68800 },
    { user_id: 'user-002', rank: 2, name: 'Rafi', total_bottles: 78, total_points: 55200 },
    { user_id: 'user-003', rank: 3, name: 'Alya', total_bottles: 64, total_points: 46900 },
    { user_id: MOCK_USER.id, rank: 4, name: MOCK_USER.name, total_bottles: 48, total_points: 34250 },
    { user_id: 'user-005', rank: 5, name: 'Dimas', total_bottles: 41, total_points: 30100 },
  ],
};

export const MOCK_EDUCATION = [
  {
    id: 'edu-001',
    slug: 'cara-memilah-botol-plastik',
    title: 'Cara Memilah Botol Plastik Sebelum Disetor',
    category: 'tutorial',
    description: 'Langkah singkat agar botol lolos validasi dan mendapat poin maksimal.',
    excerpt: 'Langkah singkat agar botol lolos validasi dan mendapat poin maksimal.',
    content: 'Kosongkan isi botol, lepas label bila perlu, pastikan botol tidak penyok berat, lalu scan dalam kondisi pencahayaan cukup.',
    media_url: '/pic1.jpg',
    estimated_read_time: 3,
    published_at: '2026-04-01T09:00:00+07:00',
  },
  {
    id: 'edu-002',
    slug: 'kenapa-daur-ulang-botol-penting',
    title: 'Kenapa Daur Ulang Botol Itu Penting',
    category: 'article',
    description: 'Dampak kecil yang konsisten bisa berarti besar untuk lingkungan kota.',
    excerpt: 'Dampak kecil yang konsisten bisa berarti besar untuk lingkungan kota.',
    content: 'Setiap botol yang tidak berakhir di TPA membantu mengurangi beban sampah, emisi distribusi material baru, dan kebocoran plastik ke sungai.',
    media_url: '/pic2.jpg',
    estimated_read_time: 4,
    published_at: '2026-03-28T15:00:00+07:00',
  },
  {
    id: 'edu-003',
    slug: 'tips-scan-biar-cepat-diterima',
    title: 'Tips Scan Biar Cepat Diterima Sistem',
    category: 'tutorial',
    description: 'Posisi botol dan pencahayaan sangat memengaruhi hasil scan.',
    excerpt: 'Posisi botol dan pencahayaan sangat memengaruhi hasil scan.',
    content: 'Letakkan botol di latar polos, arahkan label ke kamera, dan hindari bayangan tajam. Ambil gambar dari jarak sedang agar bentuk botol terbaca utuh.',
    media_url: '/duitin.png',
    estimated_read_time: 2,
    published_at: '2026-04-10T12:30:00+07:00',
  },
];

export const getMockSummary = () => {
  const validScans = MOCK_TRANSACTIONS.filter((item) => item.valid);
  const totalPoints = validScans.reduce((sum, item) => sum + (item.points || 0), 0);

  return {
    total_scans: MOCK_TRANSACTIONS.length,
    valid_scans: validScans.length,
    total_points: totalPoints,
    success_rate: Math.round((validScans.length / MOCK_TRANSACTIONS.length) * 100),
  };
};

export const getMockNotificationsPayload = ({ unreadOnly = false, limit = 50 } = {}) => {
  const base = unreadOnly ? MOCK_NOTIFICATIONS.filter((item) => !item.is_read) : MOCK_NOTIFICATIONS;
  return {
    notifications: base.slice(0, Number(limit)),
    total: base.length,
  };
};

export const getMockEducationList = ({ limit = 100, category, q } = {}) => {
  let items = [...MOCK_EDUCATION];

  if (category) {
    items = items.filter((item) => item.category === category);
  }

  if (q) {
    const lowered = q.toLowerCase();
    items = items.filter((item) =>
      item.title.toLowerCase().includes(lowered) ||
      item.excerpt.toLowerCase().includes(lowered) ||
      item.content.toLowerCase().includes(lowered)
    );
  }

  return items.slice(0, Number(limit));
};

export const getMockEducationById = (id) => MOCK_EDUCATION.find((item) => item.id === id) || null;
export const getMockEducationBySlug = (slug) => MOCK_EDUCATION.find((item) => item.slug === slug) || null;

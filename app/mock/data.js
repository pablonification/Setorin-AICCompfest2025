export const MOCK_USER = {
  id: 'local-dev-user',
  email: 'admin@local.setorin',
  name: 'Local Admin',
  photo_url: '/profile/default-profile.jpg',
  points: 34250,
  role: 'admin',
  tier: 'Panutan',
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

export const ADMIN_USERS = [
  {
    id: 'admin-001',
    email: 'admin@local.setorin',
    name: 'Local Admin',
    points: 34250,
    total_scans: 53,
    last_active: '2026-04-16T09:30:00+07:00',
    scan_ids: MOCK_TRANSACTIONS.map((item) => item.id),
  },
  {
    id: 'user-002',
    email: 'nadya@example.com',
    name: 'Nadya Pratiwi',
    points: 68800,
    total_scans: 94,
    last_active: '2026-04-15T17:12:00+07:00',
    scan_ids: ['txn-101', 'txn-102'],
  },
  {
    id: 'user-003',
    email: 'rafi@example.com',
    name: 'Rafi Mahendra',
    points: 55200,
    total_scans: 81,
    last_active: '2026-04-15T14:48:00+07:00',
    scan_ids: ['txn-103'],
  },
  {
    id: 'user-004',
    email: 'alya@example.com',
    name: 'Alya Rahma',
    points: 46900,
    total_scans: 69,
    last_active: '2026-04-14T19:05:00+07:00',
    scan_ids: ['txn-104', 'txn-105', 'txn-106'],
  },
];

export const ADMIN_WITHDRAWALS = [
  {
    id: 'awd-001',
    amount_points: 20000,
    status: 'pending',
    created_at: '2026-04-16T08:45:00+07:00',
    user_email: 'nadya@example.com',
    method_type: 'bank',
    bank_code: 'BCA',
    bank_account_number: '1234567890',
    bank_account_name: 'Nadya Pratiwi',
    admin_note: '',
  },
  {
    id: 'awd-002',
    amount_points: 15000,
    status: 'completed',
    created_at: '2026-04-15T10:15:00+07:00',
    processed_at: '2026-04-15T13:40:00+07:00',
    user_email: 'rafi@example.com',
    method_type: 'ewallet',
    ewallet_provider: 'DANA',
    phone_number: '081377777777',
    admin_note: 'Processed in afternoon batch.',
  },
  {
    id: 'awd-003',
    amount_points: 10000,
    status: 'rejected',
    created_at: '2026-04-13T16:10:00+07:00',
    processed_at: '2026-04-13T17:05:00+07:00',
    user_email: 'alya@example.com',
    method_type: 'bank',
    bank_code: 'BRI',
    bank_account_number: '9988776655',
    bank_account_name: 'Alya Rahma',
    admin_note: 'Account name mismatch.',
  },
];

export const ADMIN_EDUCATION_CONTENTS = [
  {
    id: 'aec-001',
    title: 'Cara Memilah Botol Plastik Sebelum Disetor',
    content: 'Kosongkan isi botol, lepas label bila perlu, lalu pastikan bentuk botol masih terbaca kamera.',
    content_type: 'tutorial',
    tags: ['recycling', 'tutorial', 'bottle'],
    difficulty_level: 'beginner',
    estimated_read_time: 3,
    is_published: true,
  },
  {
    id: 'aec-002',
    title: 'Kenapa Daur Ulang Botol Itu Penting',
    content: 'Setiap botol yang dialihkan dari TPA membantu mengurangi emisi dan kebocoran plastik ke lingkungan.',
    content_type: 'article',
    tags: ['environment', 'article'],
    difficulty_level: 'beginner',
    estimated_read_time: 4,
    is_published: true,
  },
  {
    id: 'aec-003',
    title: 'Panduan Audit Kualitas Setoran',
    content: 'Checklist admin untuk memeriksa konsistensi foto, validasi botol, dan akurasi poin sebelum approval.',
    content_type: 'guide',
    tags: ['admin', 'quality', 'guide'],
    difficulty_level: 'intermediate',
    estimated_read_time: 6,
    is_published: false,
  },
];

export const ADMIN_QR_CODES = [
  {
    id: 'qr-001',
    token: 'SETORIN-QR-ALPHA-001',
    status: 'active',
    usage_count: 0,
    max_uses: 1,
    expires_at: '2026-04-17T09:00:00+07:00',
    generated_at: '2026-04-16T09:00:00+07:00',
  },
  {
    id: 'qr-002',
    token: 'SETORIN-QR-BETA-002',
    status: 'used',
    usage_count: 1,
    max_uses: 1,
    expires_at: '2026-04-15T12:00:00+07:00',
    generated_at: '2026-04-14T12:00:00+07:00',
  },
  {
    id: 'qr-003',
    token: 'SETORIN-QR-GAMMA-003',
    status: 'inactive',
    usage_count: 0,
    max_uses: 5,
    expires_at: '2026-04-18T18:00:00+07:00',
    generated_at: '2026-04-16T07:30:00+07:00',
  },
];

export const ADMIN_WS_STATUS = {
  total_connections: 6,
  total_users: 4,
  status: 'active',
};

export const ADMIN_DASHBOARD_STATS = {
  totalUsers: ADMIN_USERS.length,
  totalScans: ADMIN_USERS.reduce((sum, item) => sum + item.total_scans, 0),
  totalPoints: ADMIN_USERS.reduce((sum, item) => sum + item.points, 0),
  pendingWithdrawals: ADMIN_WITHDRAWALS.filter((item) => item.status === 'pending').length,
  totalWithdrawals: ADMIN_WITHDRAWALS.length,
  activeConnections: ADMIN_WS_STATUS.total_connections,
  totalQrCodes: ADMIN_QR_CODES.length,
  activeQrCodes: ADMIN_QR_CODES.filter((item) => item.status === 'active').length,
  expiredQrCodes: ADMIN_QR_CODES.filter((item) => item.status === 'expired').length,
};

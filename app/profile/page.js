"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { makeAuthenticatedRequest } from "../utils/auth";
import SectionHeader from "../components/SectionHeader";
import SettingsRow from "../components/SettingsRow";
import HeaderBar from "../components/HeaderBar";
import ChatFab from "../components/ChatFab";
import {
  BiArrowToTop,
  BiBeer,
  BiBarcodeReader,
  BiLeaf,
  BiAward,
} from "react-icons/bi";

// Template for bug report email
const createBugReportMailto = () => {
  const subject = encodeURIComponent("Laporan Masalah - Setorin App");
  const body = encodeURIComponent(`Halo Tim Setorin,

Saya mengalami masalah dengan aplikasi Setorin. Berikut detailnya:

Informasi Perangkat:
- Sistem Operasi: (iOS/Android/Web)
- Browser: (Chrome/Safari/Firefox/dll)
- Versi Aplikasi: (jika diketahui)

 Deskripsi Masalah:
- Halaman/Fitur yang bermasalah:
- Langkah-langkah untuk mereproduksi:
- Apa yang terjadi:
- Apa yang seharusnya terjadi:

Screenshot/Video:
- (Jika memungkinkan, lampirkan screenshot atau video)

Informasi Tambahan:
- Waktu kejadian:
- Frekuensi terjadinya: (selalu/kadang-kadang/pertama kali)
- Informasi lain yang relevan:

Terima kasih atas bantuannya!

Salam,
[Nama Anda]`);

  return `mailto:arqilasp@gmail.com?subject=${subject}&body=${body}`;
};

// Statistics Card Component
function StatisticsCard({
  icon: Icon,
  total,
  label,
  monthly,
  iconColor = "var(--color-accent-amber)",
}) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Top Section - White Background */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-[var(--color-accent-amber)]">
            <Icon size={24} />
          </div>
          <div>
            <div className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)]">
              {total}
            </div>
            <div className="text-[14px] leading-5 text-[var(--color-muted)]">
              {label}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Green Background */}
      <div className="bg-[var(--color-primary-700)] px-4 py-3 flex justify-between items-center">
        <span className="text-[14px] leading-5 text-white">Bulan ini :</span>
        <span className="text-[14px] leading-5 text-white font-semibold">
          {monthly}
        </span>
      </div>
    </div>
  );
}

// Points and Rank Card Component
function PointsRankCard({ points, monthly, rank }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Top Section - White Background */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-[var(--color-accent-amber)]">
            <BiArrowToTop size={24} />
          </div>
          <div>
            <div className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)]">
              {points}
            </div>
            <div className="text-[14px] leading-5 text-[var(--color-muted)]">
              Total Setor Poin
            </div>
          </div>
        </div>
        <div
          className="px-3 py-2 rounded-[var(--radius-pill)] text-white text-[14px] leading-5 font-medium"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span>{rank}</span>
          </div>
        </div>
      </div>

      {/* Bottom Section - Green Background */}
      <div className="bg-[var(--color-primary-700)] px-4 py-3 flex justify-between items-center">
        <span className="text-[14px] leading-5 text-white">Bulan ini :</span>
        <span className="text-[14px] leading-5 text-white font-semibold">
          {monthly}
        </span>
      </div>
    </div>
  );
}

// Environmental Impact Card Component
function EnvironmentalImpactCard({ plasticAvoidedKg, co2AvoidedKg }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Top Section - White Background */}
      <div className="p-4 flex items-center space-x-3">
        <div className="text-[var(--color-accent-amber)]">
          <BiLeaf size={24} />
        </div>
        <div className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)]">
          Dampak Lingkungan
        </div>
      </div>

      {/* Bottom Section - Green Background */}
      <div className="bg-[var(--color-primary-700)] p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-[22px] leading-7 font-semibold text-[var(--color-accent-amber)]">
              {plasticAvoidedKg.toFixed(3)} kg
            </div>
            <div className="text-[12px] text-white leading-4 mt-1">
              Sampah Plastik Dihindari
            </div>
          </div>
          <div className="text-center">
            <div className="text-[22px] leading-7 font-semibold text-[var(--color-accent-amber)]">
              {co2AvoidedKg.toFixed(2)} kg
            </div>
            <div className="text-[12px] text-white leading-4 mt-1">
              CO2 Dihindari
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Achievement Card Component
function AchievementCard({ currentStreak, longestStreak }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Top Section - White Background */}
      <div className="p-4 flex items-center space-x-3">
        <div className="text-[var(--color-accent-amber)]">
          <BiAward size={24} />
        </div>
        <div className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)]">
          Pencapaian
        </div>
      </div>

      {/* Bottom Section - Green Background */}
      <div className="bg-[var(--color-primary-700)] p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-[22px] leading-7 font-semibold text-white">
              {currentStreak}
            </div>
            <div className="text-[12px] leading-4 text-white mt-1">
              Streak Hari Ini
            </div>
          </div>
          <div className="text-center">
            <div className="text-[22px] leading-7 font-semibold text-white">
              {longestStreak}
            </div>
            <div className="text-[12px] leading-4 text-white mt-1">
              Streak Terpanjang
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Force dynamic rendering to prevent build-time errors
export const dynamic = "force-dynamic";

// Statistics Component
function StatisticsSection({ user }) {
  const auth = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const fetchedOnceRef = useRef(false);
  const fetchingRef = useRef(false);

  const mapStatsFromApi = useCallback((data) => {
    return {
      points: {
        total: data.total_points ?? 0,
        monthly: data.points_this_month ?? 0,
        rank:
          data.user_tier ||
          data.tier ||
          (auth?.user?.tier ?? null) ||
          "Perintis",
      },
      bottles: {
        total: data.total_bottles ?? 0,
        monthly: data.bottles_this_month ?? 0,
      },
      scans: {
        total: data.total_scans ?? 0,
        monthly: undefined,
      },
      impact: {
        plasticAvoidedKg: Number(data.plastic_waste_diverted_kg ?? 0),
        co2AvoidedKg: Number(data.co2_emissions_saved_kg ?? 0),
      },
      achievements: {
        currentStreak: data.current_streak_days ?? 0,
        longestStreak: data.longest_streak_days ?? 0,
      },
    };
  }, []);

  const fetchStats = useCallback(async () => {
    if (fetchedOnceRef.current || fetchingRef.current) return;
    fetchedOnceRef.current = true;
    fetchingRef.current = true;

    setLoading(true);
    setError(null);
    try {
      const [personal, leaderboard] = await Promise.all([
        makeAuthenticatedRequest(
          "/api/statistics/personal",
          {},
          auth,
          setError,
          () => {}
        ),
        makeAuthenticatedRequest(
          "/api/statistics/leaderboard?limit=5",
          {},
          auth,
          setError,
          () => {}
        ),
      ]);

      if (personal) {
        setStats(mapStatsFromApi(personal));
      }
      if (leaderboard) {
        setRankings(leaderboard.rankings || []);
        setUserRank(leaderboard.user_rank || null);
        setTotalParticipants(leaderboard.total_participants || 0);
      }
    } catch (e) {
      setError(e?.message || "Gagal memuat statistik");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [auth, mapStatsFromApi]);

  useEffect(() => {
    if (auth?.token) {
      fetchStats();
    }
  }, [auth?.token, fetchStats]);

  if (!auth?.token) return null;

  return (
    <>
      {/* Statistics Content */}
      {loading && (
        <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary-600)]"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
          <div className="bg-red-50 border border-red-200 rounded-[var(--radius-md)] p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <svg
                className="h-5 w-5 text-red-600 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <p className="text-red-600 font-medium">Error: {error}</p>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <>
          {/* Points and Rank Card */}
          <div className="mb-4 grid grid-cols-1 gap-4">
            <PointsRankCard
              points={stats.points.total}
              monthly={stats.points.monthly}
              rank={stats.points.rank}
            />

            <StatisticsCard
              icon={BiBeer}
              total={stats.bottles.total}
              label="Total Botol"
              monthly={stats.bottles.monthly}
            />
          </div>

          {/* Environmental Impact Card */}
          <div className="mb-4">
            <EnvironmentalImpactCard
              plasticAvoidedKg={stats.impact.plasticAvoidedKg}
              co2AvoidedKg={stats.impact.co2AvoidedKg}
            />
          </div>

          {/* Achievement Card */}
          <div className="mb-4">
            <AchievementCard
              currentStreak={stats.achievements.currentStreak}
              longestStreak={stats.achievements.longestStreak}
            />
          </div>

          {/* Leaderboard Section */}
          <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)]">
                Papan Peringkat
              </h2>
              <div className="text-[14px] leading-5 text-[var(--color-muted)]">
                Total Peserta : {totalParticipants}
              </div>
            </div>

            {/* Your position card */}
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-primary-700)] text-white [box-shadow:var(--shadow-card)] px-5 py-4 mb-3 flex items-center justify-between">
              <div>
                <div className="text-[22px] leading-7 font-semibold">
                  #{userRank ?? "-"}
                </div>
                <div className="text-[14px] leading-5 opacity-90">
                  Posisi Kamu
                </div>
              </div>
              <div className="text-right">
                <div className="text-[22px] leading-7 font-semibold">
                  {rankings.find((r) => r.rank === userRank)?.total_bottles ??
                    0}
                </div>
                <div className="text-[14px] leading-5 opacity-90">
                  Total Botol
                </div>
              </div>
            </div>

            {/* Top list */}
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] [box-shadow:var(--shadow-card)] p-4">
              {rankings.length === 0 && (
                <div className="text-[14px] leading-5 text-[var(--color-muted)] text-center">
                  Belum ada data leaderboard
                </div>
              )}
              {rankings.map((rank) => (
                <div
                  key={rank.user_id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 border-b last:border-b-0 border-[color:rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary-700)] text-white flex items-center justify-center text-[16px] font-semibold">
                      {rank.rank}
                    </div>
                    <div className="text-[14px] leading-5 text-[var(--color-primary-700)] font-medium">
                      {rank.name || `User ${rank.user_id.slice(-4)}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] leading-6 font-semibold text-[var(--color-primary-700)]">
                      {rank.total_bottles} Botol
                    </div>
                    <div className="text-[12px] leading-4 text-[var(--color-primary-700)]/80">
                      {rank.total_points} Setor Poin
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function ProfilePage() {
  const auth = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth?.token) {
      router.push("/login");
      return;
    }
    fetchUnread();
  }, [auth?.token]);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: auth?.getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      // ignore
    }
  }, [auth]);

  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      {/* Combined Header Section */}
      <div className="bg-[var(--color-primary-700)] [box-shadow:var(--shadow-card)]">
        <HeaderBar />
        <div className="px-4 pb-4">
          {/* Profile Card */}
          <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-2 border-[var(--color-primary-700)] flex items-center justify-center overflow-hidden bg-white">
                <img
                  src={auth?.user?.photo_url || "/profile/default-profile.jpg"}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-inter font-bold text-lg leading-none text-[var(--color-primary-700)]">
                      {auth?.user?.name || auth?.user?.email || "Pengguna"}
                    </div>
                    <div className="font-inter text-xs leading-none mt-1 text-[var(--color-primary-700)]">
                      {auth?.user?.email}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Level pill */}
            <Link href="/setor-level" aria-label="Lihat Setor Level">
              <div
                className="mt-4 rounded-[16px] p-3"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <img src="/profile/level.svg" alt="Level" />
                    <span className="font-inter font-bold text-sm leading-none">
                      Perintis
                    </span>
                  </div>
                  <span className="font-inter text-sm leading-none">
                    {auth?.user?.points ?? 0} Setor Poin
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32 pt-4 space-y-6">
        <StatisticsSection user={auth?.user} />

        {/* <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
          <SectionHeader title="Akun Saya" />
          <div className="mt-3 space-y-2">
            <SettingsRow
              href="/notifications"
              label="Notifikasi"
              badge={unreadCount}
              icon="/profile/notifikasi.svg"
            />
          </div>
        </div> */}

        <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
          <SectionHeader title="Seputar Setorin" />
          <div className="mt-3 space-y-2">
            <SettingsRow
              href="/faq"
              label="Bantuan"
              icon="/profile/bantuan.svg"
            />
            <SettingsRow
              href={createBugReportMailto()}
              label="Lapor Masalah"
              icon="/profile/lapor-masalah.svg"
            />
            <SettingsRow
              href="/tentang-kami"
              label="Tentang Kami"
              icon="/profile/tentang-kami.svg"
            />
          </div>
        </div>
      </div>
      
      {/* ChatFab */}
      <ChatFab />
    </div>
  );
}

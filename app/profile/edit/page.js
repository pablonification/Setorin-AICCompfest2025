"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TopBar from "../../components/TopBar";
import { useAuth } from "../../contexts/AuthContext";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [birthdate, setBirthdate] = useState(user?.birthdate || "");
  const [city, setCity] = useState(user?.city || "");
  const [gender, setGender] = useState(user?.gender || "Pria");
  const [saving, setSaving] = useState(false);

  const canSubmit = !saving && (name?.trim().length ?? 0) > 0 && (email?.trim().length ?? 0) > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);

    try {
      // Placeholder: attempt to call backend if endpoint exists later
      // For now, update local user context only (no contract change)
      const nextUser = {
        ...user,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        birthdate,
        city: city.trim(),
        gender,
      };
      updateUser(nextUser);
      router.back();
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mobile-container font-inter">
      {/* Top bar */}
      <TopBar title="Edit Profil" />

      {/* Avatar */}
      <div className="px-4 -mt-16">
        <div className="relative mx-auto w-max">
          <div className="w-36 h-36 rounded-full border-4 border-[var(--color-primary-700)] bg-white flex items-center justify-center [box-shadow:var(--shadow-card)] overflow-hidden">
            <img src="/profile/default-profile.jpg" alt="Avatar" />
          </div>
          <button
            type="button"
            aria-label="Ubah foto"
            className="absolute -bottom-1 -right-1 z-10 w-10 h-10 rounded-full bg-white border-2 border-[var(--color-primary-700)] flex items-center justify-center"
          >
            <Image src="/profile/edit/camera.svg" fill alt="Ubah foto" />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 pt-6 pb-28 space-y-5">
        <Field label="Nama">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 outline-none text-[var(--color-primary-700)] font-semibold"
            placeholder="Nama Lengkap"
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 outline-none text-[var(--color-primary-700)] font-semibold"
            placeholder="email@contoh.com"
          />
        </Field>

        <Field label="Nomor Handphone">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 outline-none text-[var(--color-primary-700)] font-semibold"
            placeholder="08xxxxxxxxxx"
          />
        </Field>

        <Field label="Tanggal lahir">
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 outline-none text-[var(--color-primary-700)] font-semibold"
          />
        </Field>

        <Field label="Kota/ Domisili">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 outline-none text-[var(--color-primary-700)] font-semibold"
            placeholder="Nama Kota"
          />
        </Field>

        <Field label="Jenis Kelamin">
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "Wanita", label: "Wanita" },
              { key: "Pria", label: "Pria" },
              { key: "Rahasia", label: "Rahasia" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setGender(opt.key)}
                className={`px-4 py-3 rounded-[var(--radius-sm)] border text-sm ${
                  gender === opt.key
                    ? "bg-white border-[var(--color-primary-700)] text-[var(--color-primary-700)]"
                    : "bg-gray-50 border-transparent text-gray-700"
                }`}
                aria-pressed={gender === opt.key}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Connected accounts */}
        <div className="pt-4">
          <div className="h-px bg-[var(--color-primary-700)]/30" />
          <div className="mt-4">
            <div className="font-inter font-semibold text-sm text-[var(--color-primary-700)]">Hubungkan Akun</div>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <img src="/profile/edit/google.svg" alt="Google"/>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-primary-700)]">Google</div>
                    <div className="text-xs text-gray-600">{user?.email || "-"}</div>
                  </div>
                </div>
                <button type="button" className="px-3 py-1 rounded-[var(--radius-pill)] border border-[var(--color-primary-700)] text-[var(--color-primary-700)] text-xs">
                  Terhubung
                </button>
              </div>

              {/* Apple row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <span className="text-xl text-[var(--color-primary-700)]" aria-hidden></span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-primary-700)]">Apple</div>
                    <div className="text-xs text-gray-600">Tidak terhubung</div>
                  </div>
                </div>
                <button type="button" className="px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-primary-700)] text-white text-xs">
                  Hubungkan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="fixed left-0 right-0 bottom-4">
          <div className="mx-auto max-w-[430px] px-4">
            <button
              type="submit"
              disabled={!canSubmit}
              aria-busy={saving}
              aria-disabled={!canSubmit}
              className={`w-full py-4 rounded-[var(--radius-lg)] font-semibold text-base [box-shadow:var(--shadow-card)] ${
                canSubmit
                  ? "bg-[var(--color-primary-700)] text-[var(--color-accent-amber)]"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, meta, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-[var(--color-primary-700)]">{label}</label>
        {meta && <span className="text-xs text-gray-600">{meta}</span>}
      </div>
      {children}
    </div>
  );
}



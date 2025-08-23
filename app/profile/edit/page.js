"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TopBar from "../../components/TopBar";
import { useAuth } from "../../contexts/AuthContext";

// Success/Error message component
function Message({ type, message }) {
  if (!message) return null;

  return (
    <div className={`px-4 py-3 rounded-[var(--radius-sm)] text-sm font-medium ${
      type === 'success'
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-red-50 text-red-700 border border-red-200'
    }`}>
      {message}
    </div>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, token, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [birthdate, setBirthdate] = useState(user?.birthdate || "");
  const [city, setCity] = useState(user?.city || "");
  const [gender, setGender] = useState(user?.gender || "Pria");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = !saving && (name?.trim().length ?? 0) > 0 && (email?.trim().length ?? 0) > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Clear previous messages
    setSuccessMessage("");
    setErrorMessage("");
    setSaving(true);

    try {
      console.log('Profile update attempt:', {
        apiUrl: process.env.NEXT_PUBLIC_API_URL,
        token: token ? 'Token exists' : 'No token',
        user: user?.email,
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          birthdate: birthdate || null,
          city: city.trim() || null,
          gender: gender || null,
        }
      });

      // Call backend API to update profile
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          birthdate: birthdate || null,
          city: city.trim() || null,
          gender: gender || null,
        }),
      });

      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const updatedUserData = await response.json();
      console.log('Updated user data from API:', updatedUserData);

      // Update local user context with the response from backend
      updateUser({
        ...user,
        ...updatedUserData,
      });

      // Show success message
      setSuccessMessage("Profil berhasil diperbarui!");

      // Navigate back after a short delay to show success message
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (err) {
      console.error("Failed to save profile:", err);
      setErrorMessage(err.message || "Terjadi kesalahan saat menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mobile-container font-inter">
      {/* Top bar */}
      <TopBar title="Edit Profil" />

      {/* Avatar - positioned below TopBar with proper spacing */}
      <div className="px-4 pt-6">
        <div className="relative mx-auto w-max">
          <div className="rounded-full border-2 border-[var(--color-primary-700)] flex items-center justify-center overflow-hidden bg-white">
            <img src={user?.photo_url || "/profile/default-profile.jpg"} alt="Avatar" referrerPolicy="no-referrer" />
          </div>
          {/* <button
            type="button"
            aria-label="Ubah foto"
            className="absolute -bottom-1 -right-1 z-10 w-10 h-10 rounded-full bg-white border-2 border-[var(--color-primary-700)] flex items-center justify-center"
          >
            <Image src="/profile/edit/camera.svg" fill alt="Ubah foto" />
          </button> */}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 pt-6 pb-28 space-y-5">
        {/* Messages */}
        <Message type="success" message={successMessage} />
        <Message type="error" message={errorMessage} />
        <Field label="Nama">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSuccessMessage("");
              setErrorMessage("");
            }}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 outline-none text-[var(--color-primary-700)] font-semibold"
            placeholder="Nama Lengkap"
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSuccessMessage("");
              setErrorMessage("");
            }}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 outline-none text-[var(--color-primary-700)] font-semibold"
            placeholder="email@contoh.com"
          />
        </Field>

        <Field label="Nomor Handphone">
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setSuccessMessage("");
              setErrorMessage("");
            }}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 outline-none text-[var(--color-primary-700)] font-semibold"
            placeholder="08xxxxxxxxxx"
          />
        </Field>

        <Field label="Tanggal lahir">
          <input
            type="date"
            value={birthdate}
            onChange={(e) => {
              setBirthdate(e.target.value);
              setSuccessMessage("");
              setErrorMessage("");
            }}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 outline-none text-[var(--color-primary-700)] font-semibold"
          />
        </Field>

        <Field label="Kota/ Domisili">
          <input
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setSuccessMessage("");
              setErrorMessage("");
            }}
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
                onClick={() => {
                  setGender(opt.key);
                  setSuccessMessage("");
                  setErrorMessage("");
                }}
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



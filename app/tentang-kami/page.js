"use client";

import TopBar from "../components/TopBar";

export default function TentangKamiPage() {
  const profiles = [
    { name: "Arqila S. P.", role1: "AI Engineer &", role2: "Backend" },
    { name: "Athian N. M.", role1: "AI Engineer &", role2: "Backend" },
    { name: "Andhika M. A.", role1: "UI/UX Designer" },
  ];

  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      {/* Header */}
      <TopBar title="Tentang Kami" />

      <main className="px-6 pt-6 pb-28 text-[var(--color-primary-700)]">
        {/* Logo */}
        <div className="mx-auto mt-2 mb-6 w-max">
          <img src="/tentang-kami/setorin-logo.svg" alt="Setor.in" className="h-16" />
        </div>

        {/* Description paragraph */}
        <p className="text-center text-sm leading-6">
          Setorin adalah platform ekosistem berbasis web yang membantu Anda mengubah sampah terpilah menjadi aset bernilai. Melalui jaringan Setorin kami dan layanan penjemputan, kami membuat proses daur ulang menjadi lebih mudah, seru, dan menguntungkan.
        </p>

        {/* Developer heading */}
        <h2 className="mt-8 text-center text-lg font-semibold">Developer</h2>

        {/* Profiles grid */}
        <section className="mt-6 grid grid-cols-3 gap-4">
          {profiles.map((p) => (
            <article key={p.name} className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full border-2 border-[var(--color-primary-700)] flex items-center justify-center">
                <img
                  src={`/creator/${
                    p.name === "Arqila S. P."
                      ? "arqila"
                      : p.name === "Athian N. M."
                      ? "athian"
                      : p.name === "Andhika M. A."
                      ? "andhika"
                      : "unknown"
                  }.webp`}
                  alt={p.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="mt-3">
                <p className="text-base font-semibold">{p.name}</p>
                <p className="text-xs leading-4 text-[color:var(--color-muted)]">{p.role1}</p>
                {p.role2 && (
                  <p className="text-xs leading-4 text-[color:var(--color-muted)]">{p.role2}</p>
                )}
              </div>
            </article>
          ))}
        </section>

        <p className="mt-8 text-center text-sm font-semibold">
          ADA SPARTANS - Institut Teknologi Bandung
        </p>
      </main>
    </div>
  );
}



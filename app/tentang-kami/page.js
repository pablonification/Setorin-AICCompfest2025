"use client";

import TopBar from "../components/TopBar";

export default function TentangKamiPage() {
  const profiles = [
    { name: "Arqila S. P.", role1: "AI Engineer &", role2: "Backend" },
    { name: "Athian N. M.", role1: "AI Engineer &", role2: "Backend" },
    { name: "Andhika M. A.", role1: "UI/UX Designer" },
  ];

  return (
    <div className="mobile-container font-inter">
      {/* Header */}
      <TopBar title="Tentang Kami" />

      <main className="px-6 pt-6 pb-28 text-[var(--color-primary-700)]">
        {/* Logo */}
        <div className="mx-auto mt-2 mb-6 w-max">
          <img src="/tentang-kami/setorin-logo.svg" alt="Setor.in" className="h-16" />
        </div>

        {/* Description paragraph */}
        <p className="text-center text-sm leading-6">
          Setorin adalah platform ekosistem berbasis web yang membantu Anda mengubah sampah terpilah menjadi aset bernilai. Melalui jaringan SmartBin kami dan layanan penjemputan, kami membuat proses daur ulang menjadi lebih mudah, seru, dan menguntungkan.
        </p>

        {/* Developer heading */}
        <h2 className="mt-8 text-center text-lg font-semibold">Developer</h2>

        {/* Profiles grid */}
        <section className="mt-6 grid grid-cols-3 gap-4">
          {profiles.map((p) => (
            <article key={p.name} className="flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full border-2 border-[var(--color-primary-700)] flex items-center justify-center">
                {/* Avatar placeholder */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-12 h-12 text-[var(--color-primary-700)]"
                >
                  <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v1c0 .552.448 1 1 1h14c.552 0 1-.448 1-1v-1c0-2.761-3.582-5-8-5z" />
                </svg>
              </div>
              <div className="mt-3">
                <p className="text-[15px] font-semibold">{p.name}</p>
                <p className="text-xs leading-4 text-[color:var(--color-muted)]">{p.role1}</p>
                {p.role2 && (
                  <p className="text-xs leading-4 text-[color:var(--color-muted)]">{p.role2}</p>
                )}
              </div>
            </article>
          ))}
        </section>

        <p className="mt-8 text-center text-sm font-semibold">
          STEIK - Institut Teknologi Bandung
        </p>
      </main>
    </div>
  );
}



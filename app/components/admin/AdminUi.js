"use client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function AdminPageShell({ children, className = "" }) {
  return (
    <div className={cx("min-h-screen bg-transparent font-plus-jakarta", className)}>
      <div className="mx-auto max-w-7xl space-y-6">{children}</div>
    </div>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions = null,
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-500 md:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminSurface({ children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-[32px] border border-emerald-900/5 bg-white p-6 shadow-[0_4px_24px_rgba(16,185,129,0.03)] transition-all",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminSectionTitle({ title, subtitle = null, actions = null }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminBanner({ tone = "error", children }) {
  const tones = {
    error: "border-rose-100 bg-rose-50/50 text-rose-700",
    success: "border-emerald-100 bg-emerald-50/50 text-emerald-800",
    info: "border-sky-100 bg-sky-50/50 text-sky-800",
  };

  return (
    <div className={cx("rounded-2xl border px-5 py-4 text-sm font-medium", tones[tone])}>
      {children}
    </div>
  );
}

export function AdminButton({
  variant = "primary",
  icon: Icon,
  className = "",
  children,
  ...props
}) {
  const variants = {
    primary:
      "border border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_16px_-4px_rgba(16,185,129,0.2)] hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-[0_12px_20px_-4px_rgba(16,185,129,0.25)]",
    secondary:
      "border border-emerald-900/10 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-900",
    subtle:
      "border border-transparent bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900",
    danger:
      "border border-rose-500 bg-rose-500 text-white shadow-[0_8px_16px_-4px_rgba(244,63,94,0.25)] hover:-translate-y-0.5 hover:bg-rose-600",
    ghost:
      "border border-transparent bg-transparent text-slate-500 hover:bg-slate-100",
  };

  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{children}</span>
    </button>
  );
}

export function AdminInput({ className = "", ...props }) {
  return (
    <input
      className={cx(
        "w-full rounded-full border border-emerald-900/10 bg-slate-50/50 px-5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50",
        className
      )}
      {...props}
    />
  );
}

export function AdminSelect({ className = "", children, ...props }) {
  return (
    <select
      className={cx(
        "w-full rounded-full border border-emerald-900/10 bg-slate-50/50 px-5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50 appearance-none cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function AdminTextarea({ className = "", ...props }) {
  return (
    <textarea
      className={cx(
        "w-full rounded-3xl border border-emerald-900/10 bg-slate-50/50 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50",
        className
      )}
      {...props}
    />
  );
}

export function AdminLabel({ children }) {
  return (
    <label className="mb-2 block text-sm font-bold text-slate-600 ml-1">
      {children}
    </label>
  );
}

export function AdminBadge({ tone = "slate", children, className = "" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 border border-slate-200/60",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-100/60",
    amber: "bg-amber-50 text-amber-700 border border-amber-100/60",
    rose: "bg-rose-50 text-rose-700 border border-rose-100/60",
    sky: "bg-sky-50 text-sky-700 border border-sky-100/60",
    violet: "bg-violet-50 text-violet-700 border border-violet-100/60",
  };

  return (
    <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide", tones[tone], className)}>
      {children}
    </span>
  );
}

export function AdminMetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  tone = "emerald",
}) {
  const tones = {
    emerald: "bg-emerald-100/50 text-emerald-700",
    sky: "bg-sky-100/50 text-sky-700",
    amber: "bg-amber-100/50 text-amber-700",
    violet: "bg-violet-100/50 text-violet-700",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <AdminSurface className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-slate-500">{title}</div>
          <div className="mt-3 text-4xl font-black tracking-tight text-slate-900">
            {value}
          </div>
          {subtext ? (
            <div className="mt-2 text-sm font-medium text-slate-400">{subtext}</div>
          ) : null}
        </div>
        {Icon ? (
          <div className={cx("flex h-14 w-14 shrink-0 items-center justify-center rounded-full", tones[tone])}>
            <Icon className="h-6 w-6" />
          </div>
        ) : null}
      </div>
    </AdminSurface>
  );
}

export function AdminEmptyState({ title, description, action = null }) {
  return (
    <div className="rounded-3xl border border-emerald-900/5 bg-slate-50/50 px-8 py-14 text-center">
      <div className="text-xl font-bold tracking-tight text-slate-900">{title}</div>
      <div className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
        {description}
      </div>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminModal({ children, className = "", onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-md">
      <div className={cx("max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-white/20 bg-white p-8 shadow-[0_32px_64px_-12px_rgba(15,23,42,0.15)]", className)}>
        {children}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="sr-only"
            aria-label="Close modal"
          />
        ) : null}
      </div>
    </div>
  );
}

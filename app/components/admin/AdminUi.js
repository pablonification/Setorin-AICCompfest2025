"use client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function AdminPageShell({ children, className = "" }) {
  return (
    <div className={cx("min-h-screen bg-[#f6f8f7] font-plus-jakarta", className)}>
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
          <div className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-700">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-900 md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500 md:text-lg">
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
        "rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-[0_20px_42px_rgba(148,163,184,0.13)]",
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
        <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-slate-900">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminBanner({ tone = "error", children }) {
  const tones = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return (
    <div className={cx("rounded-[1.5rem] border px-5 py-4 text-sm font-medium", tones[tone])}>
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
      "border border-emerald-700 bg-emerald-700 text-white hover:-translate-y-0.5 hover:bg-emerald-800",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50",
    subtle:
      "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger:
      "border border-rose-600 bg-rose-600 text-white hover:bg-rose-700",
    ghost:
      "border border-transparent bg-transparent text-slate-500 hover:bg-slate-100",
  };

  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50",
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
        "w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100",
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
        "w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100",
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
        "w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100",
        className
      )}
      {...props}
    />
  );
}

export function AdminLabel({ children }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-slate-600">
      {children}
    </label>
  );
}

export function AdminBadge({ tone = "slate", children, className = "" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold", tones[tone], className)}>
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
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <AdminSurface className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">{title}</div>
          <div className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-900">
            {value}
          </div>
          {subtext ? (
            <div className="mt-2 text-sm text-slate-500">{subtext}</div>
          ) : null}
        </div>
        {Icon ? (
          <div className={cx("flex h-14 w-14 items-center justify-center rounded-[1.2rem]", tones[tone])}>
            <Icon className="h-6 w-6" />
          </div>
        ) : null}
      </div>
    </AdminSurface>
  );
}

export function AdminEmptyState({ title, description, action = null }) {
  return (
    <div className="rounded-[1.75rem] bg-slate-50 px-6 py-10 text-center">
      <div className="text-xl font-bold tracking-[-0.03em] text-slate-900">{title}</div>
      <div className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        {description}
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function AdminModal({ children, className = "", onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] p-4 backdrop-blur-sm">
      <div className={cx("max-h-[90vh] w-full overflow-y-auto rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_28px_60px_rgba(15,23,42,0.18)]", className)}>
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

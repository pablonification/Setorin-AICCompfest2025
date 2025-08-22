"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * TopBar - mobile header with back button and centered title
 *
 * Props:
 * - title: string (required)
 * - backHref?: string (optional; if not provided uses router.back())
 * - right?: ReactNode (optional right-side action)
 * - className?: string (optional extra classes for outer wrapper)
 */
export default function TopBar({ title, backHref, right, className }) {
	const router = useRouter();

	const BackButton = () => (
		<button
			onClick={() => (backHref ? null : router.back())}
			aria-label="Kembali"
			type="button"
		>
			<img src="/profile/back.svg" alt="Kembali" />
		</button>
	);

	return (
		<div
			className={`bg-[var(--color-primary-700)] text-white rounded-b-[var(--radius-lg)] [box-shadow:var(--shadow-card)] ${className || ""}`}
		>
			<div className="mx-auto max-w-[430px] px-4 pt-6 pb-12 relative">
				<div className="flex items-center justify-between">
					{backHref ? (
						<Link href={backHref} aria-label="Kembali">
							<img src="/profile/back.svg" alt="Kembali" />
						</Link>
					) : (
						<BackButton />
					)}

					         <h1 className="absolute left-1/2 -translate-x-1/2 text-xl leading-7 font-semibold">{title}</h1>

					{/* Right action placeholder to keep title centered */}
					<div className="w-9 h-9 flex items-center justify-center">
						{right ?? null}
					</div>
				</div>
			</div>
		</div>
	);
}



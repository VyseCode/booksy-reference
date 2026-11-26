"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type NavbarProps = { user: { name: string; avatarUrl: string } };

const links = [
  { href: "/browse", label: "Explore" },
  { href: "/appointments", label: "My bookings" },
  { href: "/favorites", label: "Favorites" },
  { href: "/owner", label: "Owner" },
];

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/browse" className="flex items-center gap-2 font-bold text-[#7c3aed]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7c3aed] text-sm text-white">
            B
          </span>
          <span className="hidden sm:inline">Booksy</span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 sm:gap-3">
          {links.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  active
                    ? "bg-[#7c3aed]/10 text-[#7c3aed]"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {label}
              </Link>
            );
          })}

          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ede9fe] text-sm font-semibold text-[#7c3aed]"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

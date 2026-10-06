"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, useSignOut } from "@/lib/api";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Opportunities" },
  { href: "/form-d", label: "Form D Leads" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Search Profile" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const signOut = useSignOut();
  return (
    <header className="border-b">
      {session && !session.isOwner && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950 dark:bg-amber-900/40 dark:text-amber-100">
          <strong>Demo.</strong> The opportunities here are sample data, so try anything:
          add, edit, score, research. Changes reset every {session.demoResetMinutes} minutes.
          Form D leads are real SEC filings.
        </div>
      )}
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <span className="font-semibold">Job Search</span>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm text-muted-foreground hover:text-foreground",
              pathname === link.href && "font-medium text-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
        {/* Only shown when a password is configured (i.e. on the hosted site). */}
        {session?.signInAvailable && (
          <span className="ml-auto text-sm">
            {session.isOwner ? (
              <button
                type="button"
                onClick={() => signOut.mutate()}
                className="text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            ) : (
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Owner sign in
              </Link>
            )}
          </span>
        )}
      </nav>
    </header>
  );
}

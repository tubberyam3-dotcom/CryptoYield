import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const primaryItems = [
  { href: "/", icon: "fas fa-home", label: "Home" },
  { href: "/portfolios", icon: "fas fa-briefcase", label: "Portfolios" },
  { href: "/staking", icon: "fas fa-coins", label: "Bonds" },
  { href: "/challenges", icon: "fas fa-trophy", label: "Challenges" },
];

const moreItems = [
  { href: "/stocks", icon: "fas fa-chart-area", label: "Stocks" },
  { href: "/transactions", icon: "fas fa-history", label: "Transaction History" },
  { href: "/wallet", icon: "fas fa-wallet", label: "Wallet" },
  { href: "/rewards", icon: "fas fa-gift", label: "Rewards" },
  { href: "/settings", icon: "fas fa-cog", label: "Settings" },
];

export function MobileNav() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const { hasJointAccount } = useAuth();

  useEffect(() => {
    if (!menuOpen) return;
    const focusable = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || []);
    focusable()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      moreButtonRef.current?.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);
  const linkClass = (active: boolean) => cn(
    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
  );

  return (
    <div className="lg:hidden" data-mobile-nav>
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-[98] bg-foreground/25"
            onClick={() => setMenuOpen(false)}
          />
          <section
            ref={menuRef}
            id="mobile-navigation-menu"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="fixed inset-x-2 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-[99] max-h-[min(72dvh,34rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">More destinations</h2>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>
            <nav aria-label="Additional destinations" className="grid gap-1 sm:grid-cols-2">
              {moreItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={linkClass(isActive(item.href))}>
                  <i className={`${item.icon} w-5 text-center`} aria-hidden="true"></i>
                  <span>{item.label}</span>
                </Link>
              ))}
              <Link href="/settings?tab=security#xp-code" onClick={() => setMenuOpen(false)} className={linkClass(location.includes("tab=security"))}>
                <i className="fas fa-key w-5 text-center" aria-hidden="true"></i>
                <span>XP Code</span>
              </Link>
              <Link href="/settings?tab=account#joint-account" onClick={() => setMenuOpen(false)} className={linkClass(location.includes("tab=account"))}>
                <i className="fas fa-users w-5 text-center" aria-hidden="true"></i>
                <span>{hasJointAccount ? "Joint account" : "Set up joint account"}</span>
              </Link>
            </nav>
          </section>
        </>
      )}

      <nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-[100] rounded-xl border border-border bg-card p-1.5 shadow-lg"
      >
        <div className="grid grid-cols-5 gap-1">
          {primaryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors sm:text-xs",
                isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              data-testid={`link-mobile-${item.label.toLowerCase()}`}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <i className={`${item.icon} text-sm`} aria-hidden="true"></i>
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            ref={moreButtonRef}
            type="button"
            aria-label="More destinations"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors sm:text-xs",
              menuOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <i className="fas fa-ellipsis-h text-sm" aria-hidden="true"></i>
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

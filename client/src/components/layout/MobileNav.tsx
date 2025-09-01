import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: "fas fa-home", label: "Home" },
    { href: "/portfolios", icon: "fas fa-briefcase", label: "Portfolios" },
    { href: "/staking", icon: "fas fa-coins", label: "Staking" },
    { href: "/challenges", icon: "fas fa-trophy", label: "Challenges" },
    { href: "/wallet", icon: "fas fa-wallet", label: "Wallet" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="grid grid-cols-5 gap-1 p-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a 
              className={cn(
                "flex flex-col items-center p-2 transition-colors",
                isActive(item.href) ? "text-primary" : "text-muted-foreground"
              )}
              data-testid={`link-mobile-${item.label.toLowerCase()}`}
            >
              <i className={`${item.icon} text-lg mb-1`}></i>
              <span className="text-xs">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: "fas fa-home", label: "Home" },
    { href: "/portfolios", icon: "fas fa-briefcase", label: "Portfolios" },
    { href: "/staking", icon: "fas fa-coins", label: "Staking" },
    { href: "/challenges", icon: "fas fa-trophy", label: "Challenges" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <div 
      className="lg:hidden fixed left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-[100]" 
      data-mobile-nav
      style={{ 
        position: 'fixed',
        bottom: '0px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="grid grid-cols-4 gap-1 p-3">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a 
              className={cn(
                "flex items-center justify-center p-4 transition-colors rounded-lg",
                isActive(item.href) 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              data-testid={`link-mobile-${item.label.toLowerCase()}`}
              title={item.label}
            >
              <i className={`${item.icon} text-xl`}></i>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}

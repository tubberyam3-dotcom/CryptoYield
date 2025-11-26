import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 50) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
      className={cn(
        "lg:hidden bg-card border-t border-border z-[100] shadow-lg transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
      data-mobile-nav
      style={{ 
        position: 'fixed',
        bottom: '6px',
        left: '6px',
        right: '6px',
        transform: isVisible ? 'translateY(0) translateZ(0)' : 'translateY(100%) translateZ(0)',
        WebkitTransform: isVisible ? 'translateY(0) translateZ(0)' : 'translateY(100%) translateZ(0)',
        height: 'auto',
        borderRadius: '10px',
        marginBottom: 'env(safe-area-inset-bottom, 0px)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none'
      }}
    >
      <div className="grid grid-cols-4 gap-0.5 p-1.5">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex items-center justify-center p-2 transition-colors rounded-md",
              isActive(item.href) 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            data-testid={`link-mobile-${item.label.toLowerCase()}`}
            title={item.label}
          >
            <i className={`${item.icon} text-base`}></i>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import refluxLogo from "@assets/Reflux(1)_1763816395638.png";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navigationItems = [
    { href: "/", icon: "fas fa-chart-line", label: "Dashboard" },
    { href: "/portfolios", icon: "fas fa-briefcase", label: "Portfolios" },
    { href: "/stocks", icon: "fas fa-chart-area", label: "Stocks" },
    { href: "/staking", icon: "fas fa-coins", label: "Bonds" },
    { href: "/challenges", icon: "fas fa-trophy", label: "Challenges" },
    { href: "/transactions", icon: "fas fa-history", label: "Transaction History" },
    { href: "/wallet", icon: "fas fa-wallet", label: "Wallet" },
    { href: "/settings", icon: "fas fa-cog", label: "Settings" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <img 
              src={refluxLogo} 
              alt="Reflux Capital Logo" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <button 
            className="lg:hidden p-2 rounded-lg bg-sidebar-accent/20 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors" 
            onClick={onClose}
            data-testid="button-close-sidebar"
            title="Close Menu"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={onClose}
                  data-testid={`link-nav-${item.label.toLowerCase()}`}
                >
                  <i className={`${item.icon} w-5`}></i>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-sidebar-border mt-6 pt-6">
            <ul className="space-y-2">
              {user?.role === 'admin' && (
                <li>
                  <Link 
                    href="/admin"
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                      isActive("/admin")
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    onClick={onClose}
                    data-testid="link-admin-panel"
                  >
                    <i className="fas fa-shield-alt w-5"></i>
                    <span>Admin Panel</span>
                  </Link>
                </li>
              )}
              <li>
                <button 
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full text-left font-medium"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <i className="fas fa-sign-out-alt w-5"></i>
                  <span>Logout</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
}

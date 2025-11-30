import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import refluxLogoDark from "@assets/Reflux(1)_1763816395638.png";
import refluxLogoLight from "@assets/Reflux(2)_1763816395638.png";

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
  sidebarOpen?: boolean;
}

export function TopBar({ title, onMenuClick, sidebarOpen = false }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isDemoMode } = useAuth();
  const [, setLocation] = useLocation();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <header className="bg-card border-b border-border px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
        <button 
          className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex-shrink-0"
          onClick={onMenuClick}
          data-testid="button-toggle-sidebar"
          title="Open Menu"
        >
          <i className="fas fa-bars text-sm sm:text-lg"></i>
        </button>
        
        {/* Logo on Mobile - Hide when sidebar is open */}
        {!sidebarOpen && (
          <img 
            src={theme === 'dark' ? refluxLogoLight : refluxLogoDark} 
            alt="Reflux Capital" 
            className="h-8 sm:h-10 md:h-11 w-auto object-contain lg:hidden flex-shrink-0"
          />
        )}
        
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold truncate hidden lg:block" data-testid="text-page-title">{title}</h1>
          {isDemoMode && (
            <Badge variant="outline" className="text-xs flex-shrink-0 hidden xs:inline-flex">
              Demo Mode
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
        {/* Theme Toggle */}
        <button 
          className="p-1.5 sm:p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={toggleTheme}
          data-testid="button-toggle-theme"
        >
          <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'} text-sm sm:text-base`}></i>
        </button>
        
        {/* Notifications */}
        <button className="relative p-1.5 sm:p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors hidden xs:block" data-testid="button-notifications">
          <i className="fas fa-bell text-sm sm:text-base"></i>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-destructive rounded-full"></span>
        </button>
        
        {/* User Profile - Clickable to open Settings */}
        <button 
          onClick={() => setLocation('/settings')}
          className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity cursor-pointer" 
          data-testid="user-profile"
        >
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium" data-testid="text-user-name">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || 'User'
              }
            </div>
            <div className="text-xs text-muted-foreground" data-testid="text-user-status">
              {user?.kycStatus === 'approved' ? 'Verified User' : 'Pending Verification'}
            </div>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-medium">
            <span data-testid="text-user-initials" className="text-xs sm:text-sm">
              {getInitials(user?.firstName, user?.lastName)}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}

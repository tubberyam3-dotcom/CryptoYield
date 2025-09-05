import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isDemoMode } = useAuth();

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
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold truncate" data-testid="text-page-title">{title}</h1>
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
        
        {/* User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3" data-testid="user-profile">
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
        </div>
      </div>
    </header>
  );
}

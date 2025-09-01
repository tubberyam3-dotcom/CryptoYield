import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-4">
        <button 
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={onMenuClick}
          data-testid="button-toggle-sidebar"
        >
          <i className="fas fa-bars"></i>
        </button>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{title}</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <button 
          className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={toggleTheme}
          data-testid="button-toggle-theme"
        >
          <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`}></i>
        </button>
        
        {/* Notifications */}
        <button className="relative p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" data-testid="button-notifications">
          <i className="fas fa-bell"></i>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
        </button>
        
        {/* User Profile */}
        <div className="flex items-center space-x-3" data-testid="user-profile">
          <div className="text-right">
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
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-medium">
            <span data-testid="text-user-initials">
              {getInitials(user?.firstName, user?.lastName)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

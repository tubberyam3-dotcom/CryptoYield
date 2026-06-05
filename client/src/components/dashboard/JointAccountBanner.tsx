import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Heart, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";

export function JointAccountBanner() {
  const { hasJointAccount, jointAccount, userRole } = useAuth();

  if (!hasJointAccount || !jointAccount) return null;

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/40 dark:to-purple-950/40 border border-pink-200 dark:border-pink-800 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-lg">
          <Heart className="w-4 h-4 text-pink-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{jointAccount.name}</span>
            <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/60 dark:text-pink-300 text-xs px-2 py-0 border-0">
              Joint Account
            </Badge>
            {userRole && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                {userRole === 'primary' ? 'Creator' : 'Partner'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Dashboard shows combined investments from both partners
          </p>
        </div>
      </div>
      <Link href="/settings">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1">
          <LinkIcon className="w-3 h-3" />
          Manage
        </Button>
      </Link>
    </div>
  );
}

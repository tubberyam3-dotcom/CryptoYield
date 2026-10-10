import { Button } from "@/components/ui/button";
import { Check, Copy, KeyRound } from "lucide-react";

interface XpCodeSettingsProps {
  id: string;
  hasXpCode: boolean;
  generatedCode: string | null;
  copied: boolean;
  generating: boolean;
  onGenerate: () => void;
  onCopy: () => void;
}

export function XpCodeSettings({
  id, hasXpCode, generatedCode, copied, generating, onGenerate, onCopy,
}: XpCodeSettingsProps) {
  return (
    <section id={id} tabIndex={-1} className="scroll-mt-24 space-y-3" data-settings-section="xp-code">
      <h4 className="font-medium flex items-center gap-2">
        <KeyRound className="w-4 h-4" /> XP Code
      </h4>
      <p className="text-sm text-muted-foreground">
        Generate your XP code once for secure login. Joint withdrawals use a separate one-time code sent to your partner’s registered email.
      </p>
      {generatedCode ? (
        <div className="space-y-3">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Your XP code — save it securely:</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <code className="text-base sm:text-lg font-mono font-bold tracking-widest text-primary break-all">
                {generatedCode}
              </code>
              <Button variant="outline" size="sm" onClick={onCopy} data-testid="button-copy-xp-code" aria-label="Copy XP code">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-2">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Save this code now. You will not be able to see it again after leaving this page.
          </p>
        </div>
      ) : hasXpCode ? (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> XP code already generated</p>
          <p className="text-xs text-muted-foreground mt-2">
            Use your saved code. For security, an existing code cannot be displayed or regenerated.
          </p>
        </div>
      ) : (
        <Button onClick={onGenerate} disabled={generating} variant="outline" data-testid="button-generate-xp-code">
          <KeyRound className="w-4 h-4 mr-2" />{generating ? "Generating..." : "Generate XP Code"}
        </Button>
      )}
    </section>
  );
}

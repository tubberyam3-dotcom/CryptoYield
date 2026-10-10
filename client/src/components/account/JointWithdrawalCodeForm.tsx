import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type JointWithdrawalCodeFormProps = {
  code: string;
  onCodeChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  sent: boolean;
  ready: boolean;
  recipientEmail?: string;
  disabled?: boolean;
};

export function JointWithdrawalCodeForm({
  code,
  onCodeChange,
  onSend,
  sending,
  sent,
  ready,
  recipientEmail,
  disabled = false,
}: JointWithdrawalCodeFormProps) {
  const isDisabled = disabled;

  return (
    <Card className="w-full space-y-4 rounded-lg border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="space-y-1.5">
        <Label htmlFor="withdrawal-xp-code">Joint withdrawal XP code</Label>
        <p id="withdrawal-xp-code-help" className="text-sm leading-relaxed text-muted-foreground">
          Enter the one-time XP code sent to your partner’s registered email to authorize this withdrawal.
        </p>
        <Input
          id="withdrawal-xp-code"
          data-testid="withdrawal-xp-code"
          type="text"
          autoComplete="one-time-code"
          maxLength={11}
          value={code}
          onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
          aria-describedby="withdrawal-xp-code-help"
          placeholder="Enter 11-character code"
          disabled={!sent || isDisabled}
          className="w-full max-w-md font-mono uppercase tracking-[0.12em] disabled:cursor-not-allowed"
        />
      </div>

      {sent && (
        <p role="status" className="text-sm leading-relaxed text-muted-foreground">
          Code sent to <span className="font-medium text-foreground">{recipientEmail || "your partner’s registered email"}</span>.
          {" "}It expires in 10 minutes and can be used only once.
        </p>
      )}

      {!ready && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Complete your withdrawal details and continue to the review step to request a code.
        </p>
      )}

      <Button
        type="button"
        data-testid="withdrawal-send-xp-code"
        onClick={onSend}
        disabled={sending || !ready || isDisabled}
        aria-busy={sending}
        className="w-full sm:w-auto"
      >
        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {sending ? "Sending code…" : sent ? "Resend code" : "Send code to partner"}
      </Button>
    </Card>
  );
}

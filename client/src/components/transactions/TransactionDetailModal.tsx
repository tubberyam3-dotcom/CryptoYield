import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  CheckCheck,
  Hash,
  CalendarDays,
  Wallet,
  MapPin,
  Info,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface TxRecord {
  id: string;
  refId: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: string;
  method: string;
  methodLabel: string;
  date: string | Date | null;
  destination?: string | null;
  processedAt?: string | Date | null;
  reason?: string | null;
  isAdminAdjustment?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; Icon: any }> = {
    completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0", Icon: CheckCircle2 },
    pending:   { label: "Pending",   className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-0", Icon: Clock },
    approved:  { label: "Approved",  className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0", Icon: CheckCircle2 },
    rejected:  { label: "Rejected",  className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0", Icon: XCircle },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300 border-0", Icon: Ban },
  };
  const cfg = map[status] ?? { label: status, className: "border-0", Icon: Clock };
  return (
    <Badge className={cfg.className}>
      <cfg.Icon className="w-3 h-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

function Row({ icon, label, children }: { icon: JSX.Element; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 text-muted-foreground flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm font-medium break-all">{children}</div>
      </div>
    </div>
  );
}

const fmtDate = (d: string | Date | null | undefined) =>
  d ? format(new Date(d), "MMM d, yyyy 'at' HH:mm") : "—";

export function TransactionDetailModal({
  transaction,
  open,
  onClose,
}: {
  transaction: TxRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  if (!transaction) return null;

  const isDeposit = transaction.type === "deposit";
  const amountColor = isDeposit ? "text-green-600" : "text-red-500";
  const amountPrefix = isDeposit ? "+" : "-";
  const Icon = isDeposit ? ArrowDownRight : ArrowUpRight;
  const iconBg = isDeposit ? "bg-green-500/10" : "bg-red-500/10";
  const iconColor = isDeposit ? "text-green-500" : "text-red-500";

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="transaction-detail-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className={`p-1.5 rounded-lg ${iconBg}`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            Transaction Details
          </DialogTitle>
        </DialogHeader>

        {/* Amount hero */}
        <div className="text-center py-5 border-b border-border">
          <p className={`text-3xl font-bold ${amountColor}`}>
            {amountPrefix}${transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {isDeposit ? "Deposit" : "Withdrawal"}
          </p>
          <div className="mt-3 flex justify-center">
            <StatusBadge status={transaction.status} />
          </div>
        </div>

        {/* Details rows */}
        <div className="space-y-0">
          <Row icon={<Hash className="w-4 h-4" />} label="Reference">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{transaction.refId}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                onClick={() => copy(transaction.refId)}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </Row>

          <Row icon={<Wallet className="w-4 h-4" />} label="Method">
            {transaction.methodLabel}
          </Row>

          <Row icon={<CalendarDays className="w-4 h-4" />} label="Date Placed">
            {fmtDate(transaction.date)}
          </Row>

          {transaction.processedAt && (
            <Row icon={<CheckCheck className="w-4 h-4" />} label="Processed">
              {fmtDate(transaction.processedAt)}
            </Row>
          )}

          {transaction.destination && (
            <Row icon={<MapPin className="w-4 h-4" />} label="Destination">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs break-all">{transaction.destination}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100 flex-shrink-0"
                  onClick={() => copy(transaction.destination!)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </Row>
          )}

          {transaction.reason && (
            <Row icon={<Info className="w-4 h-4" />} label="Note">
              {transaction.reason}
            </Row>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

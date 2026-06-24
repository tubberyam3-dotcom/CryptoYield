import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowUpFromLine,
  Clock,
  CheckCircle2,
  CheckCheck,
  XCircle,
  Ban,
  Loader2,
  RefreshCw,
  Eye,
  Check,
  X,
  Flag,
} from "lucide-react";
import { format } from "date-fns";
import type { Withdrawal } from "@shared/schema";

type WithdrawalWithUser = Withdrawal & {
  user: { email: string; firstName: string; lastName: string };
};

const METHOD_LABELS: Record<string, string> = {
  crypto: "Crypto",
  wire_transfer: "Wire Transfer",
  merchant_pay: "Merchant Pay",
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          <Clock className="w-3 h-3 mr-1" /> Placed
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <CheckCheck className="w-3 h-3 mr-1" /> Completed
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <XCircle className="w-3 h-3 mr-1" /> Rejected
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
          <Ban className="w-3 h-3 mr-1" /> Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function MethodBadge({ method }: { method: string }) {
  const classMap: Record<string, string> = {
    crypto: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    wire_transfer: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    merchant_pay: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  };
  return (
    <Badge variant="outline" className={classMap[method] ?? ""}>
      {METHOD_LABELS[method] ?? method}
    </Badge>
  );
}

function DetailDialog({
  withdrawal,
  open,
  onClose,
  onAction,
  isPending,
}: {
  withdrawal: WithdrawalWithUser | null;
  open: boolean;
  onClose: () => void;
  onAction: (id: string, action: string) => void;
  isPending: boolean;
}) {
  if (!withdrawal) return null;

  const meta = withdrawal.metadata as Record<string, any> | null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-red-500" />
            Withdrawal Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground mb-0.5">User</p>
              <p className="font-medium">{withdrawal.user.firstName} {withdrawal.user.lastName}</p>
              <p className="text-xs text-muted-foreground">{withdrawal.user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Amount</p>
              <p className="font-bold text-red-600 text-base">
                -${parseFloat(withdrawal.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Method</p>
              <MethodBadge method={withdrawal.withdrawMethod} />
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Status</p>
              <StatusBadge status={withdrawal.status ?? "pending"} />
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground mb-0.5">Destination</p>
              <p className="font-mono text-xs bg-muted rounded px-2 py-1 break-all">
                {withdrawal.destinationAddress || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Placed</p>
              <p>{withdrawal.createdAt ? format(new Date(withdrawal.createdAt), "MMM d, yyyy HH:mm") : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Processed</p>
              <p>{withdrawal.processedAt ? format(new Date(withdrawal.processedAt), "MMM d, yyyy HH:mm") : "—"}</p>
            </div>
          </div>

          {meta && Object.keys(meta).length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1">Additional Info</p>
              <div className="bg-muted rounded p-2 space-y-1">
                {Object.entries(meta).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {withdrawal.status === "pending" && (
              <>
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => { onAction(withdrawal.id, "approve"); onClose(); }}
                  disabled={isPending}
                >
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => { onAction(withdrawal.id, "reject"); onClose(); }}
                  disabled={isPending}
                >
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-gray-600"
                  onClick={() => { onAction(withdrawal.id, "cancel"); onClose(); }}
                  disabled={isPending}
                >
                  <Ban className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </>
            )}
            {withdrawal.status === "approved" && (
              <>
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => { onAction(withdrawal.id, "complete"); onClose(); }}
                  disabled={isPending}
                >
                  <CheckCheck className="w-4 h-4 mr-1" /> Mark Completed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => { onAction(withdrawal.id, "reject"); onClose(); }}
                  disabled={isPending}
                >
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-gray-600"
                  onClick={() => { onAction(withdrawal.id, "cancel"); onClose(); }}
                  disabled={isPending}
                >
                  <Ban className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawalTable({
  items,
  onView,
  onAction,
  isPending,
  emptyLabel,
}: {
  items: WithdrawalWithUser[];
  onView: (w: WithdrawalWithUser) => void;
  onAction: (id: string, action: string) => void;
  isPending: boolean;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-14 text-muted-foreground">
        <ArrowUpFromLine className="w-8 h-8 mx-auto mb-3 opacity-30" />
        <p>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Destination</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((w) => (
          <TableRow key={w.id}>
            <TableCell>
              <div>
                <p className="font-medium">{w.user.firstName} {w.user.lastName}</p>
                <p className="text-xs text-muted-foreground">{w.user.email}</p>
              </div>
            </TableCell>
            <TableCell className="font-semibold text-red-600">
              -${parseFloat(w.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell>
              <MethodBadge method={w.withdrawMethod} />
            </TableCell>
            <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground font-mono" title={w.destinationAddress ?? ""}>
              {w.destinationAddress || "—"}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {w.createdAt ? format(new Date(w.createdAt), "MMM d, yyyy HH:mm") : "—"}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-1 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() => onView(w)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                {w.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => onAction(w.id, "approve")}
                      disabled={isPending}
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onAction(w.id, "reject")}
                      disabled={isPending}
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {w.status === "approved" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => onAction(w.id, "complete")}
                      disabled={isPending}
                      title="Mark Completed"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onAction(w.id, "reject")}
                      disabled={isPending}
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function WithdrawalManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("placed");
  const [selected, setSelected] = useState<WithdrawalWithUser | null>(null);

  const { data: withdrawals = [], isLoading, refetch } = useQuery<WithdrawalWithUser[]>({
    queryKey: ["/api/admin/withdrawals"],
  });

  const mutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await apiRequest("POST", `/api/admin/withdrawals/${id}/${action}`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Updated", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Action failed", variant: "destructive" });
    },
  });

  const handleAction = (id: string, action: string) => mutation.mutate({ id, action });

  const placed    = withdrawals.filter((w) => w.status === "pending");
  const approved  = withdrawals.filter((w) => w.status === "approved");
  const completed = withdrawals.filter((w) => w.status === "completed");
  const all       = withdrawals;

  const stats = {
    placed:    placed.length,
    approved:  approved.length,
    completed: completed.length,
    total:     all.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Withdrawal Management</h3>
          <p className="text-sm text-muted-foreground">Review and process user withdrawal requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Placed",    value: stats.placed,    color: "text-yellow-600", icon: Clock },
          { label: "Approved",  value: stats.approved,  color: "text-blue-600",   icon: CheckCircle2 },
          { label: "Completed", value: stats.completed, color: "text-green-600",  icon: CheckCheck },
          { label: "Total",     value: stats.total,     color: "text-foreground", icon: Flag },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Icon className={`w-4 h-4 ${color}`} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="placed">
                <Clock className="w-4 h-4 mr-1.5" />
                Placed ({stats.placed})
              </TabsTrigger>
              <TabsTrigger value="approved">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approved ({stats.approved})
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Completed ({stats.completed})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({stats.total})
              </TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex justify-center py-14">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <TabsContent value="placed">
                  <WithdrawalTable
                    items={placed}
                    onView={setSelected}
                    onAction={handleAction}
                    isPending={mutation.isPending}
                    emptyLabel="No pending withdrawal requests"
                  />
                </TabsContent>
                <TabsContent value="approved">
                  <WithdrawalTable
                    items={approved}
                    onView={setSelected}
                    onAction={handleAction}
                    isPending={mutation.isPending}
                    emptyLabel="No approved withdrawals awaiting completion"
                  />
                </TabsContent>
                <TabsContent value="completed">
                  <WithdrawalTable
                    items={completed}
                    onView={setSelected}
                    onAction={handleAction}
                    isPending={mutation.isPending}
                    emptyLabel="No completed withdrawals yet"
                  />
                </TabsContent>
                <TabsContent value="all">
                  <WithdrawalTable
                    items={all}
                    onView={setSelected}
                    onAction={handleAction}
                    isPending={mutation.isPending}
                    emptyLabel="No withdrawals found"
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <DetailDialog
        withdrawal={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onAction={handleAction}
        isPending={mutation.isPending}
      />
    </div>
  );
}

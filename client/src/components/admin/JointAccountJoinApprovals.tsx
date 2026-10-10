import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Clock3, RefreshCw, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

type JoinRequestStatus = "pending" | "approved" | "rejected";

interface JoinRequest {
  id: number | string;
  status: JoinRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  jointAccountId?: number | string;
  requesterId?: number | string;
  requesterFirstName?: string;
  requesterLastName?: string;
  requesterEmail?: string;
  jointAccountName: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
}

const statusStyles: Record<JoinRequestStatus, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-800",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-300 bg-rose-50 text-rose-800",
};

function displayName(first?: string, last?: string) {
  return [first, last].filter(Boolean).join(" ") || "Name unavailable";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function JointAccountJoinApprovals() {
  const queryClient = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [failedReviewId, setFailedReviewId] = useState<string | null>(null);
  const { data: requests, isLoading, isError, refetch } = useQuery<JoinRequest[]>({
    queryKey: ["/api/admin/joint-account-join-requests"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string | number; status: "approved" | "rejected" }) => {
      await apiRequest("PATCH", `/api/admin/joint-account-join-requests/${id}`, { status });
    },
    onMutate: ({ id }) => {
      setReviewingId(String(id));
      setFailedReviewId(null);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/joint-account-join-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
      ]);
    },
    onSettled: () => setReviewingId(null),
    onError: (_error, variables) => setFailedReviewId(String(variables.id)),
  });

  const history = requests ?? [];
  const pending = history.filter((request) => request.status === "pending");
  const pastRequests = history.filter((request) => request.status !== "pending");

  const identity = (request: JoinRequest, owner: boolean) => owner
    ? { name: displayName(request.ownerFirstName, request.ownerLastName), email: request.ownerEmail }
    : { name: displayName(request.requesterFirstName, request.requesterLastName), email: request.requesterEmail };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border bg-card shadow-none">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Join-code requests
            {pending.length > 0 && (
              <Badge variant="secondary" className="ml-1 tabular-nums">{pending.length} pending</Badge>
            )}
          </CardTitle>
          <CardDescription>Review applicants before they can access a shared account.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-3" aria-label="Loading join requests">
              {[0, 1].map((item) => <div key={item} className="h-28 animate-pulse rounded-md border bg-muted/50" />)}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Join requests could not be loaded.
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try again
              </Button>
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center">
              <Check className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="font-medium">No requests awaiting review</p>
              <p className="mt-1 text-sm text-muted-foreground">New join-code applications will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((request) => {
                const applicant = identity(request, false);
                const owner = identity(request, true);
                const busy = reviewingId === String(request.id);
                return (
                  <article key={request.id} className="rounded-md border border-border bg-background p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{request.jointAccountName || "Joint account"}</h3>
                          <Badge variant="outline" className={statusStyles.pending}>Pending</Badge>
                        </div>
                        <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Applicant</p>
                            <p className="mt-0.5 font-medium">{applicant.name}</p>
                            <p className="break-all text-muted-foreground">{applicant.email || "Email unavailable"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Account owner</p>
                            <p className="mt-0.5 font-medium">{owner.name}</p>
                            <p className="break-all text-muted-foreground">{owner.email || "Email unavailable"}</p>
                          </div>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" /> Submitted {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          onClick={() => reviewMutation.mutate({ id: request.id, status: "approved" })}
                          disabled={reviewMutation.isPending}
                          aria-label={`Approve request from ${applicant.name}`}
                        >
                          <Check className="mr-1.5 h-4 w-4" /> {busy ? "Saving…" : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reviewMutation.mutate({ id: request.id, status: "rejected" })}
                          disabled={reviewMutation.isPending}
                          aria-label={`Reject request from ${applicant.name}`}
                        >
                          <X className="mr-1.5 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                    {failedReviewId === String(request.id) && (
                      <p role="alert" className="mt-3 text-sm text-destructive">
                        Review could not be saved. Please try again.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border bg-card shadow-none">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle>Request history</CardTitle>
          <CardDescription>Previously reviewed join-code requests.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4" aria-label="Loading request history">
              {[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded bg-muted/50" />)}
            </div>
          ) : pastRequests.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No reviewed requests yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {pastRequests.map((request) => (
                <div key={request.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{request.jointAccountName || "Joint account"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {displayName(request.requesterFirstName, request.requesterLastName)} · {request.requesterEmail || "Email unavailable"}
                    </p>
                  </div>
                  <div className="min-w-0 text-xs text-muted-foreground">
                    Owner: {displayName(request.ownerFirstName, request.ownerLastName)}
                  </div>
                  <Badge variant="outline" className={`w-fit capitalize ${statusStyles[request.status] || ""}`}>
                    {request.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground sm:text-right">
                    Reviewed {formatDate(request.reviewedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {isError && <p role="alert" className="px-4 pb-4 text-sm text-destructive">History is unavailable until requests load.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

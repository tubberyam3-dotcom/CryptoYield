import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { 
  ExternalLink, 
  Copy, 
  TrendingUp, 
  Zap, 
  Trophy, 
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader,
  Clock,
  Receipt,
  Shield,
  Link2
} from "lucide-react";

interface TransactionDetailModalProps {
  transaction: any;
  open: boolean;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, open, onClose }: TransactionDetailModalProps) {
  if (!transaction) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending': return <Loader className="w-5 h-5 text-yellow-600 animate-spin" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'investment': return <TrendingUp className="w-6 h-6 text-blue-600" />;
      case 'staking': return <Zap className="w-6 h-6 text-purple-600" />;
      case 'challenge': return <Trophy className="w-6 h-6 text-yellow-600" />;
      case 'deposit': return <ArrowDownRight className="w-6 h-6 text-green-600" />;
      case 'withdrawal': return <ArrowUpRight className="w-6 h-6 text-red-600" />;
      default: return <DollarSign className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="transaction-detail-modal">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getTypeIcon(transaction.type)}
            <div>
              <DialogTitle className="text-xl">{transaction.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon(transaction.status)}
                <Badge className={getStatusColor(transaction.status)}>
                  {transaction.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(transaction.timestamp, 'MMM dd, yyyy • HH:mm:ss')}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Overview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Transaction Overview
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{transaction.id}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transaction.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium capitalize">{transaction.type} • {transaction.subtype}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-lg">${transaction.amount.toLocaleString()}</span>
                  </div>
                  
                  {transaction.asset && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Asset</span>
                      <span className="font-medium">{transaction.asset}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {transaction.fee && transaction.fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee</span>
                      <span className="font-medium">${transaction.fee}</span>
                    </div>
                  )}
                  
                  {transaction.returns && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Returns</span>
                      <span className="font-medium text-green-600">
                        +${transaction.returns.toLocaleString()} ({transaction.returnPercentage}%)
                      </span>
                    </div>
                  )}
                  
                  {transaction.apy && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">APY</span>
                      <span className="font-medium text-purple-600">{transaction.apy}%</span>
                    </div>
                  )}
                  
                  {transaction.estimatedRewards && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Rewards</span>
                      <span className="font-medium text-green-600">
                        ${transaction.estimatedRewards.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Type-Specific Details */}
          {transaction.type === 'investment' && transaction.portfolio && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Investment Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portfolio</span>
                    <span className="font-medium">{transaction.portfolio.name}</span>
                  </div>
                  {transaction.originalAmount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original Investment</span>
                      <span className="font-medium">${transaction.originalAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {transaction.type === 'staking' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  Staking Details
                </h3>
                <div className="space-y-3">
                  {transaction.stakingPlan && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Staking Plan</span>
                      <span className="font-medium">{transaction.stakingPlan}</span>
                    </div>
                  )}
                  {transaction.duration && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium capitalize">{transaction.duration}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {transaction.type === 'challenge' && transaction.challenge && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Challenge Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Challenge</span>
                    <span className="font-medium">{transaction.challenge.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Amount</span>
                    <span className="font-medium">${transaction.challenge.target.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reward</span>
                    <span className="font-medium">{transaction.challenge.reward}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(transaction.type === 'deposit' || transaction.type === 'withdrawal') && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Transfer Details
                </h3>
                <div className="space-y-3">
                  {transaction.address && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {transaction.type === 'withdrawal' ? 'To Address' : 'From Address'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{transaction.address.slice(0, 8)}...{transaction.address.slice(-6)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(transaction.address)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blockchain Details */}
          {transaction.txHash && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Blockchain Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Transaction Hash</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{transaction.txHash}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transaction.txHash)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(`https://etherscan.io/tx/${transaction.txHash}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <p className="text-muted-foreground">{transaction.description}</p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="flex gap-2">
              {transaction.txHash && (
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://etherscan.io/tx/${transaction.txHash}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </Button>
              )}
              <Button
                onClick={() => copyToClipboard(JSON.stringify(transaction, null, 2))}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Details
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
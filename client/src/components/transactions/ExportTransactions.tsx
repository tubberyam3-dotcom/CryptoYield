import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Download, FileText, Table, Code } from "lucide-react";

interface ExportTransactionsProps {
  transactions: any[];
}

export function ExportTransactions({ transactions }: ExportTransactionsProps) {
  const [exportFormat, setExportFormat] = useState("csv");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = (data: any[]) => {
    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Subtype',
      'Title',
      'Description',
      'Amount',
      'Asset',
      'Status',
      'Fee',
      'Returns',
      'Return %',
      'TX Hash',
      'APY',
      'Duration'
    ];

    const csvRows = [
      headers.join(','),
      ...data.map(tx => [
        tx.id,
        format(tx.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        tx.type,
        tx.subtype || '',
        `"${tx.title}"`,
        `"${tx.description}"`,
        tx.amount,
        tx.asset || '',
        tx.status,
        tx.fee || 0,
        tx.returns || '',
        tx.returnPercentage || '',
        tx.txHash || '',
        tx.apy || '',
        tx.duration || ''
      ].join(','))
    ];

    return csvRows.join('\n');
  };

  const exportToJSON = (data: any[]) => {
    return JSON.stringify(data, null, 2);
  };

  const exportToTXT = (data: any[]) => {
    return data.map(tx => {
      return [
        `Transaction ID: ${tx.id}`,
        `Date: ${format(tx.timestamp, 'MMM dd, yyyy HH:mm:ss')}`,
        `Type: ${tx.type} (${tx.subtype || 'N/A'})`,
        `Title: ${tx.title}`,
        `Description: ${tx.description}`,
        `Amount: $${tx.amount.toLocaleString()}`,
        `Asset: ${tx.asset || 'N/A'}`,
        `Status: ${tx.status}`,
        `Fee: $${tx.fee || 0}`,
        `Returns: ${tx.returns ? `$${tx.returns.toLocaleString()} (${tx.returnPercentage}%)` : 'N/A'}`,
        `TX Hash: ${tx.txHash || 'N/A'}`,
        '---'
      ].join('\n');
    }).join('\n\n');
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (exportFormat) {
        case 'csv':
          content = exportToCSV(transactions);
          filename = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = exportToJSON(transactions);
          filename = `transactions_${format(new Date(), 'yyyy-MM-dd')}.json`;
          mimeType = 'application/json';
          break;
        case 'txt':
          content = exportToTXT(transactions);
          filename = `transactions_${format(new Date(), 'yyyy-MM-dd')}.txt`;
          mimeType = 'text/plain';
          break;
        default:
          throw new Error('Unsupported format');
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Downloaded ${transactions.length} transactions as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your transactions",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv': return <Table className="w-4 h-4" />;
      case 'json': return <Code className="w-4 h-4" />;
      case 'txt': return <FileText className="w-4 h-4" />;
      default: return <Download className="w-4 h-4" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'csv': return 'Spreadsheet format, compatible with Excel and Google Sheets';
      case 'json': return 'Structured data format, ideal for developers and data analysis';
      case 'txt': return 'Plain text format, human-readable transaction details';
      default: return '';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="export-transactions-button">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" data-testid="export-transactions-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Transactions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Transaction Count</p>
              <p className="text-sm text-muted-foreground">Ready to export</p>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {transactions.length}
            </Badge>
          </div>

          <div className="space-y-3">
            <Label htmlFor="format">Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger data-testid="format-select">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    <span>CSV (Excel/Sheets)</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    <span>JSON (Structured Data)</span>
                  </div>
                </SelectItem>
                <SelectItem value="txt">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>TXT (Plain Text)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-start gap-2">
                {getFormatIcon(exportFormat)}
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {exportFormat.toUpperCase()} Format
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {getFormatDescription(exportFormat)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <DialogTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogTrigger>
            <Button 
              onClick={handleExport}
              disabled={isExporting || transactions.length === 0}
              data-testid="confirm-export-button"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {transactions.length} Transactions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
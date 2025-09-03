import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Filter, X, Calendar as CalendarIcon } from "lucide-react";

interface TransactionFiltersProps {
  onFiltersChange: (filters: any) => void;
  currentFilters: any;
}

export function TransactionFilters({ onFiltersChange, currentFilters }: TransactionFiltersProps) {
  const [localFilters, setLocalFilters] = useState(currentFilters);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    const filters = {
      ...localFilters,
      dateFrom,
      dateTo
    };
    onFiltersChange(filters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      type: 'all',
      status: 'all',
      amountMin: '',
      amountMax: '',
      asset: 'all'
    };
    setLocalFilters(emptyFilters);
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange({ ...emptyFilters, dateFrom: undefined, dateTo: undefined });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.type !== 'all') count++;
    if (localFilters.status !== 'all') count++;
    if (localFilters.amountMin) count++;
    if (localFilters.amountMax) count++;
    if (localFilters.asset !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="advanced-filters-button">
          <Filter className="w-4 h-4 mr-2" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" data-testid="advanced-filters-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Type & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={localFilters.type} onValueChange={(value) => updateFilter('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="investment">Investments</SelectItem>
                  <SelectItem value="staking">Staking</SelectItem>
                  <SelectItem value="challenge">Challenges</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={localFilters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Amount Range */}
          <div className="space-y-2">
            <Label>Amount Range</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amountMin" className="text-sm text-muted-foreground">
                  Minimum Amount ($)
                </Label>
                <Input
                  id="amountMin"
                  type="number"
                  placeholder="0"
                  value={localFilters.amountMin}
                  onChange={(e) => updateFilter('amountMin', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="amountMax" className="text-sm text-muted-foreground">
                  Maximum Amount ($)
                </Label>
                <Input
                  id="amountMax"
                  type="number"
                  placeholder="No limit"
                  value={localFilters.amountMax}
                  onChange={(e) => updateFilter('amountMax', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Asset Filter */}
          <div className="space-y-2">
            <Label>Asset</Label>
            <Select value={localFilters.asset} onValueChange={(value) => updateFilter('asset', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                <SelectItem value="ADA">Cardano (ADA)</SelectItem>
                <SelectItem value="DOT">Polkadot (DOT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Filters ({activeFilterCount})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {localFilters.type !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Type: {localFilters.type}
                  </Badge>
                )}
                {localFilters.status !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {localFilters.status}
                  </Badge>
                )}
                {localFilters.amountMin && (
                  <Badge variant="secondary" className="text-xs">
                    Min: ${localFilters.amountMin}
                  </Badge>
                )}
                {localFilters.amountMax && (
                  <Badge variant="secondary" className="text-xs">
                    Max: ${localFilters.amountMax}
                  </Badge>
                )}
                {dateFrom && (
                  <Badge variant="secondary" className="text-xs">
                    From: {format(dateFrom, "MMM dd")}
                  </Badge>
                )}
                {dateTo && (
                  <Badge variant="secondary" className="text-xs">
                    To: {format(dateTo, "MMM dd")}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
            >
              Clear All
            </Button>
            <div className="flex gap-2">
              <DialogTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button onClick={applyFilters}>
                  Apply Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs bg-white text-primary">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
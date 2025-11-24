import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Zap, Save } from "lucide-react";

export function SystemSettings() {
  const [conversionRate, setConversionRate] = useState("");
  const { toast } = useToast();

  const { data: settings } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ["/api/admin/settings"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      return await apiRequest("POST", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "XP conversion rate updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const xpRateSetting = settings?.find(s => s.key === "xp_conversion_rate");
    if (xpRateSetting) {
      setConversionRate(xpRateSetting.value);
    } else {
      setConversionRate("0.01"); // Default rate
    }
  }, [settings]);

  const handleSaveConversionRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(conversionRate);
    
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: "Invalid Value",
        description: "Conversion rate must be a positive number",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      key: "xp_conversion_rate",
      value: conversionRate,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">System Settings</h3>
        <p className="text-muted-foreground">Configure platform-wide settings and parameters</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <CardTitle>XP Conversion Rate</CardTitle>
          </div>
          <CardDescription>
            Set the conversion rate from XP to cash (e.g., 0.01 = 1 XP = $0.01)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConversionRate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="conversionRate">Conversion Rate ($)</Label>
                <Input
                  id="conversionRate"
                  type="number"
                  step="0.0001"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(e.target.value)}
                  placeholder="0.01"
                  required
                  data-testid="input-xp-conversion-rate"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: 1 XP = ${parseFloat(conversionRate || "0").toFixed(4)}
                </p>
              </div>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full md:w-auto"
                data-testid="button-save-conversion-rate"
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Rate
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Example Conversions</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>100 XP =</span>
                <span className="font-semibold">${(100 * parseFloat(conversionRate || "0")).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>500 XP =</span>
                <span className="font-semibold">${(500 * parseFloat(conversionRate || "0")).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>1000 XP =</span>
                <span className="font-semibold">${(1000 * parseFloat(conversionRate || "0")).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Additional Settings</CardTitle>
          </div>
          <CardDescription>
            More platform configuration options coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Additional system settings will be available here in future updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

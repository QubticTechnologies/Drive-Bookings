import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useGetRideBilling } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

export default function Invoice() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: bill, isLoading, error } = useGetRideBilling(parseInt(id || "0", 10), {
    query: { enabled: !!id }
  });

  if (isLoading) return <Layout><div className="flex justify-center p-20 animate-pulse">Generating invoice...</div></Layout>;
  if (error || !bill) return <Layout><div className="flex justify-center p-20 text-destructive">Invoice not found or ride not completed.</div></Layout>;

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-6 -ml-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="bg-white text-zinc-950 p-8 md:p-12 relative overflow-hidden">
          {/* Subtle watermark */}
          <div className="absolute top-20 right-10 opacity-5 pointer-events-none">
            <FileText className="w-64 h-64" />
          </div>

          <div className="flex justify-between items-start border-b border-zinc-200 pb-8 mb-8">
            <div>
              <h1 className="text-4xl font-display font-bold tracking-tighter mb-2 text-zinc-950">INVOICE</h1>
              <div className="text-zinc-500 font-mono text-sm">#INV-{bill.id.toString().padStart(6, '0')}</div>
              <div className="text-zinc-500 font-mono text-sm">{format(new Date(bill.createdAt), 'MMM dd, yyyy HH:mm')}</div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-xl text-zinc-950">DriveApp Inc.</div>
              <div className="text-zinc-500 text-sm">contact@driveapp.com</div>
              <Badge variant={bill.status === 'paid' ? 'success' : 'warning'} className="mt-4">
                {bill.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Billed To</div>
              <div className="font-semibold text-lg text-zinc-950">{bill.clientName}</div>
            </div>
            {bill.driverId && (
              <div>
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Driver ID</div>
                <div className="font-semibold text-lg text-zinc-950">DRV-{bill.driverId}</div>
              </div>
            )}
          </div>

          <div className="space-y-4 mb-8 text-zinc-950">
            <div className="flex justify-between items-end border-b border-zinc-100 pb-4">
              <div>
                <div className="font-semibold text-zinc-800">Base Fare</div>
                <div className="text-sm text-zinc-500">Standard pickup fee</div>
              </div>
              <div className="font-mono">{formatCurrency(bill.baseFare, bill.currency)}</div>
            </div>
            
            <div className="flex justify-between items-end border-b border-zinc-100 pb-4">
              <div className="w-2/3">
                <div className="font-semibold text-zinc-800">Distance Fare</div>
                <div className="text-sm text-zinc-500 leading-snug mt-1">
                  {bill.distanceKm.toFixed(2)} km distance<br/>
                  <span className="text-xs">From: {bill.pickupLocation}</span><br/>
                  <span className="text-xs">To: {bill.dropoffLocation}</span>
                </div>
              </div>
              <div className="font-mono">{formatCurrency(bill.distanceFare, bill.currency)}</div>
            </div>
          </div>

          <div className="bg-zinc-50 rounded-2xl p-6 flex justify-between items-center mb-8 border border-zinc-200">
            <div className="font-display font-bold text-xl text-zinc-950">Total Amount</div>
            <div className="font-display font-bold text-3xl text-zinc-950">{formatCurrency(bill.totalFare, bill.currency)}</div>
          </div>

          {bill.status === 'paid' && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium bg-emerald-50 py-3 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" /> Successfully Paid
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { MapPin, Navigation, Car, Star, Phone, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useGetRide } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSession } from "@/store/use-session";
import { formatCurrency } from "@/lib/utils";

export default function ClientRideTracker() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { setActiveRideId } = useSession();

  const { data: ride, isLoading } = useGetRide(parseInt(id || "0", 10), {
    query: {
      enabled: !!id,
      refetchInterval: 3000 // Poll intensely for live feel
    }
  });

  useEffect(() => {
    if (ride?.status === 'completed') {
      setActiveRideId(null);
    }
  }, [ride?.status, setActiveRideId]);

  if (isLoading || !ride) {
    return <Layout><div className="flex justify-center p-20 animate-pulse">Loading ride details...</div></Layout>;
  }

  const steps = [
    { key: 'pending', label: 'Finding Driver' },
    { key: 'accepted', label: 'Driver on the way' },
    { key: 'in_progress', label: 'En route to destination' },
    { key: 'completed', label: 'Arrived' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === ride.status) !== -1 ? steps.findIndex(s => s.key === ride.status) : 3;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">Ride Status</h1>
          <Badge variant={ride.status === 'completed' ? 'success' : 'neutral'} className="text-sm px-4 py-1.5">
            {ride.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Stepper */}
        <Card className="py-8 px-6 md:px-12">
          <div className="relative flex justify-between">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-secondary -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-1000 ease-out" 
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%`, boxShadow: '0 0 10px hsl(var(--primary))' }}
            />
            
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-3">
                  <motion.div 
                    initial={false}
                    animate={{ 
                      scale: isCurrent ? 1.2 : 1,
                      backgroundColor: isPast || isCurrent ? "hsl(var(--primary))" : "hsl(var(--secondary))" 
                    }}
                    className={`w-6 h-6 rounded-full border-4 border-card flex items-center justify-center`}
                  />
                  <div className={`absolute top-10 text-xs md:text-sm font-medium w-32 text-center ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-10" /> {/* Spacer for labels */}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Driver Details */}
          <Card>
            <h3 className="font-semibold text-lg mb-6 border-b border-border pb-4">Your Driver</h3>
            {ride.driver ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center border border-white/10">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{ride.driver.name}</div>
                    <div className="flex items-center gap-1 text-primary text-sm mt-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-bold">{ride.driver.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground ml-1">({ride.driver.totalRides} trips)</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-secondary/40 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <div>
                    <div className="font-display font-bold text-lg">{ride.driver.vehiclePlate}</div>
                    <div className="text-sm text-muted-foreground">{ride.driver.vehicleColor} {ride.driver.vehicleMake} {ride.driver.vehicleModel}</div>
                  </div>
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                    <Car className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
                Matching with the nearest available driver...
              </div>
            )}
          </Card>

          {/* Trip Details */}
          <Card>
            <h3 className="font-semibold text-lg mb-6 border-b border-border pb-4">Trip Info</h3>
            
            <div className="space-y-6 mb-8">
              <div className="flex gap-4">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  <div className="w-0.5 h-10 bg-border my-1" />
                  <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(173,255,0,0.6)]" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Pickup</div>
                    <div className="font-medium">{ride.pickupLocation}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Drop-off</div>
                    <div className="font-medium">{ride.dropoffLocation}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Fare</div>
                <div className="text-3xl font-display font-bold text-primary">
                  {formatCurrency(ride.finalFare || ride.estimatedFare)}
                </div>
              </div>
              
              {ride.status === 'completed' && (
                <Button onClick={() => setLocation(`/bill/${ride.id}`)} variant="outline">
                  <FileText className="w-4 h-4 mr-2" /> View Invoice
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

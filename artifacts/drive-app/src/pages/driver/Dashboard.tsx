import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Power, MapPin, Navigation, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useGetDriver, 
  useUpdateDriverStatus, 
  useListRides, 
  useUpdateRideStatus,
  useUpdateDriverLocation,
  UpdateDriverStatusRequestStatus,
  UpdateRideStatusRequestStatus,
  Ride
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSession } from "@/store/use-session";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function DriverDashboard() {
  const { driverId } = useSession();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!driverId) setLocation("/");
  }, [driverId, setLocation]);

  // Queries
  const { data: driver, refetch: refetchDriver } = useGetDriver(driverId as number, { query: { enabled: !!driverId } });
  
  const { data: allRides, refetch: refetchRides } = useListRides(undefined, { 
    query: { refetchInterval: 5000 } // Poll every 5s for new rides or updates
  });

  const pendingRides = allRides?.filter(r => r.status === 'pending') || [];
  const myActiveRides = allRides?.filter(r => r.driverId === driverId && ['accepted', 'in_progress'].includes(r.status)) || [];
  const currentRide = myActiveRides[0]; // Assume 1 active at a time

  // Mutations
  const updateStatusMutation = useUpdateDriverStatus({
    mutation: { onSuccess: () => { refetchDriver(); toast({ title: "Status updated" }); } }
  });

  const updateRideMutation = useUpdateRideStatus({
    mutation: { onSuccess: () => { refetchRides(); } }
  });

  const locationMutation = useUpdateDriverLocation();
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Broadcast simulated GPS location every 5s when on a ride
  useEffect(() => {
    if (!driverId) return;
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);

    const broadcastLocation = () => {
      // Simulate movement around Nassau
      const baseLat = 25.048 + (Math.random() - 0.5) * 0.08;
      const baseLng = -77.355 + (Math.random() - 0.5) * 0.12;
      locationMutation.mutate({ driverId: driverId as number, data: { lat: baseLat, lng: baseLng } });
    };

    broadcastLocation(); // Immediately on mount
    locationIntervalRef.current = setInterval(broadcastLocation, 5000);

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [driverId]);

  if (!driver) return <Layout><div className="flex justify-center p-20"><span className="animate-pulse">Loading dashboard...</span></div></Layout>;

  const toggleAvailability = () => {
    const newStatus = driver.status === 'available' ? 'offline' : 'available';
    updateStatusMutation.mutate({ driverId: driver.id, data: { status: newStatus as UpdateDriverStatusRequestStatus } });
  };

  const handleRideAction = (rideId: number, status: UpdateRideStatusRequestStatus) => {
    updateRideMutation.mutate({ 
      rideId, 
      data: { status, driverId: driver.id } 
    });
    if (status === 'completed') {
      toast({ title: "Ride Completed!", description: "Great job." });
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Sidebar: Profile & Status */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-secondary border border-border flex items-center justify-center text-3xl font-display uppercase overflow-hidden">
                <img src={`${import.meta.env.BASE_URL}images/car-render.png`} className="w-full h-full object-cover opacity-80" alt="Vehicle" />
              </div>
              <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-card ${driver.status === 'available' ? 'bg-primary box-glow' : 'bg-muted-foreground'}`} />
            </div>
            
            <h2 className="text-2xl font-bold">{driver.name}</h2>
            <p className="text-muted-foreground mb-6">{driver.vehicleMake} {driver.vehicleModel} • {driver.vehiclePlate}</p>

            <div className="w-full grid grid-cols-2 gap-4 mb-6">
              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rating</div>
                <div className="text-2xl font-bold font-display text-primary">{driver.rating.toFixed(1)}</div>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rides</div>
                <div className="text-2xl font-bold font-display">{driver.totalRides}</div>
              </div>
            </div>

            <Button 
              className="w-full" 
              variant={driver.status === 'available' ? 'secondary' : 'primary'}
              onClick={toggleAvailability}
              isLoading={updateStatusMutation.isPending}
            >
              <Power className="w-4 h-4 mr-2" />
              {driver.status === 'available' ? 'Go Offline' : 'Go Online'}
            </Button>
          </Card>
        </div>

        {/* Main Content: Active Ride or Pending Requests */}
        <div className="lg:col-span-2 space-y-6">
          
          {currentRide ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-primary/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <Badge variant="warning" className="mb-2 uppercase tracking-widest">{currentRide.status.replace('_', ' ')}</Badge>
                    <h3 className="text-2xl font-bold font-display">Active Ride</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Estimated Fare</div>
                    <div className="text-3xl font-bold text-primary">{formatCurrency(currentRide.estimatedFare)}</div>
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                      <div className="w-0.5 h-12 bg-border my-1" />
                      <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(173,255,0,0.5)]" />
                    </div>
                    <div className="flex-1 space-y-6">
                      <div>
                        <div className="text-sm text-muted-foreground">Pickup</div>
                        <div className="font-medium text-lg">{currentRide.pickupLocation}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Drop-off</div>
                        <div className="font-medium text-lg">{currentRide.dropoffLocation}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-secondary/50 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Client</div>
                      <div className="font-medium">{currentRide.clientName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Distance</div>
                      <div className="font-medium">{currentRide.distanceKm.toFixed(1)} km</div>
                    </div>
                  </div>
                </div>

                {currentRide.status === 'accepted' && (
                  <Button 
                    className="w-full" size="lg"
                    onClick={() => handleRideAction(currentRide.id, 'in_progress')}
                    isLoading={updateRideMutation.isPending}
                  >
                    <Navigation className="w-5 h-5 mr-2" /> Start Ride
                  </Button>
                )}
                
                {currentRide.status === 'in_progress' && (
                  <Button 
                    className="w-full" size="lg" variant="outline"
                    onClick={() => handleRideAction(currentRide.id, 'completed')}
                    isLoading={updateRideMutation.isPending}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" /> Complete Ride
                  </Button>
                )}
              </Card>
            </motion.div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold">Ride Requests</h3>
                <Badge>{pendingRides.length} Pending</Badge>
              </div>

              {driver.status !== 'available' ? (
                <Card className="text-center py-16 border-dashed border-2">
                  <Power className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-medium mb-2">You are offline</h4>
                  <p className="text-muted-foreground">Go online to receive ride requests.</p>
                </Card>
              ) : pendingRides.length === 0 ? (
                <Card className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <h4 className="text-lg font-medium mb-2">Searching for riders...</h4>
                  <p className="text-muted-foreground">Stay tuned. Requests will appear here.</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {pendingRides.map(ride => (
                      <motion.div
                        key={ride.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <Card className="p-5 hover:bg-secondary/30 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="font-bold text-lg">{formatCurrency(ride.estimatedFare)}</div>
                              <div className="text-sm text-muted-foreground">{ride.distanceKm.toFixed(1)} km • {ride.clientName}</div>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              {format(new Date(ride.createdAt), 'HH:mm')}
                            </div>
                          </div>
                          
                          <div className="flex gap-3 mb-6">
                            <div className="flex flex-col items-center mt-1">
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                              <div className="w-0.5 h-6 bg-border my-0.5" />
                              <div className="w-3 h-3 rounded-full bg-primary" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="text-sm line-clamp-1">{ride.pickupLocation}</div>
                              <div className="text-sm line-clamp-1">{ride.dropoffLocation}</div>
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <Button 
                              className="flex-1" 
                              onClick={() => handleRideAction(ride.id, 'accepted')}
                              isLoading={updateRideMutation.isPending}
                            >
                              Accept
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Navigation, User, Phone, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useCreateRide } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/store/use-session";
import { useToast } from "@/hooks/use-toast";
import { simulateCoordinates, calculateDistanceKm, calculateEstimatedFare, formatCurrency } from "@/lib/utils";

export default function ClientBook() {
  const [, setLocation] = useLocation();
  const { setMode, setClientDetails, setActiveRideId, clientDetails } = useSession();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clientName: clientDetails?.name || "Emma Watson",
    clientPhone: clientDetails?.phone || "+44 7800 123456",
    pickupLocation: "King's Cross Station, London",
    dropoffLocation: "Heathrow Airport, London",
    notes: ""
  });

  // Calculate live estimates
  const pickupCoords = simulateCoordinates(formData.pickupLocation);
  const dropoffCoords = simulateCoordinates(formData.dropoffLocation);
  const distance = calculateDistanceKm(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
  const estFare = calculateEstimatedFare(distance);

  const createMutation = useCreateRide({
    mutation: {
      onSuccess: (data) => {
        setMode('client');
        setClientDetails({ name: formData.clientName, phone: formData.clientPhone });
        setActiveRideId(data.id);
        toast({ title: "Ride Requested", description: "Finding a driver for you..." });
        setLocation(`/client/ride/${data.id}`);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to book ride", variant: "destructive" });
      }
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        ...formData,
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropoffLat: dropoffCoords.lat,
        dropoffLng: dropoffCoords.lng,
      }
    });
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start h-full">
        
        {/* Form Panel */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="backdrop-blur-3xl bg-card/80">
            <div className="mb-6">
              <h1 className="text-3xl font-display font-bold">Where to?</h1>
              <p className="text-muted-foreground mt-1">Request a premium ride instantly.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!clientDetails && (
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                  <Input name="clientName" label="Your Name" icon={<User className="w-4 h-4"/>} value={formData.clientName} onChange={handleChange} required />
                  <Input name="clientPhone" label="Phone" icon={<Phone className="w-4 h-4"/>} value={formData.clientPhone} onChange={handleChange} required />
                </div>
              )}

              <div className="space-y-4 relative">
                {/* Connecting line */}
                <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-border z-0" />
                
                <Input 
                  name="pickupLocation" label="Pickup" 
                  icon={<div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />} 
                  value={formData.pickupLocation} onChange={handleChange} required 
                />
                
                <Input 
                  name="dropoffLocation" label="Drop-off" 
                  icon={<div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(173,255,0,0.6)]" />} 
                  value={formData.dropoffLocation} onChange={handleChange} required 
                />
              </div>

              <div className="pt-2">
                <label className="text-sm font-medium text-foreground/80 ml-1 mb-2 block">Notes for driver (optional)</label>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px]"
                  placeholder="E.g., I'm at the south entrance"
                />
              </div>

              <div className="bg-secondary/40 rounded-2xl p-6 border border-white/5 flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Estimated Fare</div>
                  <div className="text-3xl font-display font-bold text-primary">{formatCurrency(estFare)}</div>
                  <div className="text-xs text-muted-foreground mt-1">~{distance.toFixed(1)} km distance</div>
                </div>
                <Button type="submit" size="lg" className="px-8" isLoading={createMutation.isPending}>
                  Book Ride
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Abstract Map View */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className="hidden lg:flex flex-col h-[700px] relative rounded-3xl overflow-hidden border border-white/5 shadow-2xl glass-panel"
        >
          <img src={`${import.meta.env.BASE_URL}images/hero-map.png`} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Map view" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          {/* Overlay UI to make it feel alive */}
          <div className="absolute bottom-8 left-8 right-8">
            <Card className="bg-card/90 backdrop-blur-md p-4 flex items-center gap-4 border-primary/20">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold">Ready to ride</div>
                <div className="text-sm text-muted-foreground">Drivers are available in your area</div>
              </div>
            </Card>
          </div>
        </motion.div>

      </div>
    </Layout>
  );
}

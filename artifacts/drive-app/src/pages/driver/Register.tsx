import { useState } from "react";
import { useLocation } from "wouter";
import { Car, User, Mail, Phone, Hash, PaintBucket, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useRegisterDriver } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/store/use-session";
import { useToast } from "@/hooks/use-toast";

export default function DriverRegistration() {
  const [, setLocation] = useLocation();
  const { setMode, setDriverId } = useSession();
  const { toast } = useToast();
  
  const registerMutation = useRegisterDriver({
    mutation: {
      onSuccess: (data) => {
        setMode('driver');
        setDriverId(data.id);
        toast({ title: "Registration Successful", description: "Welcome to DriveApp!" });
        setLocation("/driver/dashboard");
      },
      onError: (err) => {
        toast({ title: "Registration Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    }
  });

  const [formData, setFormData] = useState({
    name: "James Smith",
    phone: "+44 7700 900077",
    email: "james.smith@example.com",
    licenseNumber: "DRV12345678",
    vehicleMake: "Tesla",
    vehicleModel: "Model 3",
    vehicleYear: "2023",
    vehiclePlate: "LD23 XYZ",
    vehicleColor: "Midnight Silver"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      data: {
        ...formData,
        vehicleYear: parseInt(formData.vehicleYear, 10)
      }
    });
  };

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto w-full"
      >
        <Card>
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground">Driver Registration</h1>
            <p className="text-muted-foreground mt-2">Enter your personal and vehicle details to join the fleet.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="name" label="Full Name" icon={<User className="w-4 h-4"/>} value={formData.name} onChange={handleChange} required />
                <Input name="phone" label="Phone Number" icon={<Phone className="w-4 h-4"/>} value={formData.phone} onChange={handleChange} required />
                <Input name="email" label="Email Address" type="email" icon={<Mail className="w-4 h-4"/>} value={formData.email} onChange={handleChange} required className="md:col-span-2"/>
                <Input name="licenseNumber" label="License Number" icon={<BadgeCheck className="w-4 h-4"/>} value={formData.licenseNumber} onChange={handleChange} required className="md:col-span-2"/>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Vehicle Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="vehicleMake" label="Make" icon={<Car className="w-4 h-4"/>} value={formData.vehicleMake} onChange={handleChange} required />
                <Input name="vehicleModel" label="Model" icon={<Car className="w-4 h-4"/>} value={formData.vehicleModel} onChange={handleChange} required />
                <Input name="vehicleYear" label="Year" type="number" icon={<Hash className="w-4 h-4"/>} value={formData.vehicleYear} onChange={handleChange} required />
                <Input name="vehiclePlate" label="License Plate" icon={<Hash className="w-4 h-4"/>} value={formData.vehiclePlate} onChange={handleChange} required />
                <Input name="vehicleColor" label="Color" icon={<PaintBucket className="w-4 h-4"/>} value={formData.vehicleColor} onChange={handleChange} required className="md:col-span-2" />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={registerMutation.isPending}>
              Register Vehicle
            </Button>
          </form>
        </Card>
      </motion.div>
    </Layout>
  );
}

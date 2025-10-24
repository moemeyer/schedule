export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  skillLevel: 'beginner' | 'intermediate' | 'expert';
  currentLocation: Location;
  status: 'available' | 'busy' | 'offline';
  vehicleId?: string;
}

export interface Job {
  id: string;
  customerId: string;
  serviceType: string;
  location: Location;
  scheduledDate: Date;
  duration: number;
  priority: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedTechnicianId?: string;
  requiredSkills: string[];
  notes?: string;
}

export interface Route {
  id: string;
  technicianId: string;
  date: Date;
  jobs: Job[];
  totalDistance: number;
  totalDuration: number;
  optimized: boolean;
}

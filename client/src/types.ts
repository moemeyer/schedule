export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

export enum ServiceType {
  GENERAL_PEST = 'general_pest',
  TERMITE = 'termite',
  RODENT = 'rodent',
  BED_BUG = 'bed_bug',
  MOSQUITO = 'mosquito',
  WILDLIFE = 'wildlife',
  INSPECTION = 'inspection',
  FOLLOW_UP = 'follow_up'
}

export enum SkillLevel {
  TRAINEE = 'trainee',
  JUNIOR = 'junior',
  SENIOR = 'senior',
  SPECIALIST = 'specialist'
}

export enum JobStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum RouteStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export interface Skill {
  serviceType: ServiceType;
  level: SkillLevel;
  certified: boolean;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: Skill[];
  homeLocation: Location;
  currentLocation?: Location;
  active: boolean;
}

export interface Job {
  id: string;
  customerId: string;
  serviceType: ServiceType;
  location: Location;
  estimatedDurationMinutes: number;
  priority: number;
  status: JobStatus;
  assignedTechnicianId?: string;
  scheduledTime?: Date;
}

export interface RouteStop {
  jobId: string;
  job?: Job;
  sequenceNumber: number;
  estimatedArrivalTime: Date;
  estimatedDepartureTime: Date;
  distanceFromPreviousKm: number;
}

export interface Route {
  id: string;
  date: Date;
  technicianId: string;
  technician?: Technician;
  stops: RouteStop[];
  status: RouteStatus;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  optimizationScore: number;
}

export interface GPSUpdate {
  technicianId: string;
  location: Location;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

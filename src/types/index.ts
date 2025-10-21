// Core data models for intelligent routing system

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

export enum VehicleType {
  VAN = 'van',
  TRUCK = 'truck',
  CAR = 'car',
  SUV = 'suv'
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
  availableHours: TimeWindow[];
  maxJobsPerDay: number;
  active: boolean;
  currentLocation?: Location;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  licensePlate: string;
  capacity: number; // in cubic feet or liters
  equipmentTypes: ServiceType[]; // what services this vehicle is equipped for
  fuelEfficiency: number; // mpg or km/l
  maxRangeKm: number;
  active: boolean;
  assignedTechnicianId?: string;
  currentLocation?: Location;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: Location;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  customerId: string;
  customer?: Customer;
  serviceType: ServiceType;
  location: Location;
  estimatedDurationMinutes: number;
  priority: number; // 1-10, higher = more urgent
  timeWindow?: TimeWindow;
  requiredSkills: Skill[];
  requiredEquipment: string[];
  notes?: string;
  status: JobStatus;
  assignedTechnicianId?: string;
  assignedRouteId?: string;
  scheduledTime?: Date;
  completedTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteStop {
  jobId: string;
  job?: Job;
  sequenceNumber: number;
  estimatedArrivalTime: Date;
  estimatedDepartureTime: Date;
  actualArrivalTime?: Date;
  actualDepartureTime?: Date;
  distanceFromPreviousKm: number;
  durationFromPreviousMinutes: number;
}

export interface Route {
  id: string;
  date: Date;
  technicianId: string;
  technician?: Technician;
  vehicleId: string;
  vehicle?: Vehicle;
  stops: RouteStop[];
  status: RouteStatus;
  startLocation: Location;
  endLocation: Location;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  optimizationScore: number; // 0-100, higher = better optimized
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GPSUpdate {
  technicianId: string;
  location: Location;
  timestamp: Date;
  speed?: number; // km/h
  heading?: number; // degrees
}

export interface DistanceMatrixEntry {
  origin: Location;
  destination: Location;
  distanceKm: number;
  durationMinutes: number;
  timestamp: Date;
}

export interface RouteOptimizationRequest {
  jobs: Job[];
  technicians: Technician[];
  vehicles: Vehicle[];
  date: Date;
  constraints?: RouteConstraints;
}

export interface RouteConstraints {
  maxStopsPerRoute?: number;
  maxRouteHours?: number;
  maxTotalDistanceKm?: number;
  requireSkillMatch?: boolean;
  requireEquipmentMatch?: boolean;
  minimizeDistance?: boolean;
  minimizeTime?: boolean;
  balanceWorkload?: boolean;
}

export interface OptimizedRoute {
  route: Route;
  score: number;
  warnings: string[];
}

export interface RouteOptimizationResult {
  routes: OptimizedRoute[];
  unassignedJobs: Job[];
  totalScore: number;
  totalDistanceKm: number;
  totalDurationHours: number;
  computationTimeMs: number;
}

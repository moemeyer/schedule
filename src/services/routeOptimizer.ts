import {
  Job,
  Technician,
  Vehicle,
  Route,
  RouteStop,
  RouteOptimizationRequest,
  RouteOptimizationResult,
  OptimizedRoute,
  RouteConstraints,
  Location,
  Skill,
  ServiceType,
  RouteStatus,
} from '../types';
import { DistanceService } from './distanceService';
import { addMinutes, parseISO, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export class RouteOptimizer {
  private distanceService: DistanceService;
  private defaultConstraints: RouteConstraints = {
    maxStopsPerRoute: 25,
    maxRouteHours: 10,
    maxTotalDistanceKm: 300,
    requireSkillMatch: true,
    requireEquipmentMatch: true,
    minimizeDistance: true,
    minimizeTime: true,
    balanceWorkload: true,
  };

  constructor(distanceService: DistanceService) {
    this.distanceService = distanceService;
  }

  /**
   * Main optimization method
   */
  async optimize(request: RouteOptimizationRequest): Promise<RouteOptimizationResult> {
    const startTime = Date.now();
    const constraints = { ...this.defaultConstraints, ...request.constraints };

    const routes: OptimizedRoute[] = [];
    const unassignedJobs: Job[] = [];

    // Filter available technicians and vehicles
    const availableTechnicians = request.technicians.filter(t => t.active);
    const availableVehicles = request.vehicles.filter(v => v.active);

    // Create technician-vehicle pairs
    const techVehiclePairs = this.createTechnicianVehiclePairs(
      availableTechnicians,
      availableVehicles
    );

    // Sort jobs by priority (highest first)
    const sortedJobs = [...request.jobs].sort((a, b) => b.priority - a.priority);

    // Assign jobs to technicians
    const jobAssignments = new Map<string, Job[]>();

    for (const job of sortedJobs) {
      let assigned = false;

      for (const pair of techVehiclePairs) {
        if (this.canAssignJob(job, pair.technician, pair.vehicle, constraints)) {
          if (!jobAssignments.has(pair.technician.id)) {
            jobAssignments.set(pair.technician.id, []);
          }

          const currentJobs = jobAssignments.get(pair.technician.id)!;

          // Check workload balance
          if (currentJobs.length < (constraints.maxStopsPerRoute || 25)) {
            currentJobs.push(job);
            assigned = true;
            break;
          }
        }
      }

      if (!assigned) {
        unassignedJobs.push(job);
      }
    }

    // Optimize routes for each technician
    for (const pair of techVehiclePairs) {
      const jobs = jobAssignments.get(pair.technician.id);
      if (jobs && jobs.length > 0) {
        const optimizedRoute = await this.optimizeRouteForTechnician(
          jobs,
          pair.technician,
          pair.vehicle,
          request.date,
          constraints
        );

        if (optimizedRoute) {
          routes.push(optimizedRoute);
        }
      }
    }

    // Calculate totals
    const totalDistanceKm = routes.reduce((sum, r) => sum + r.route.totalDistanceKm, 0);
    const totalDurationHours = routes.reduce((sum, r) => sum + r.route.totalDurationMinutes / 60, 0);
    const totalScore = routes.reduce((sum, r) => sum + r.score, 0) / Math.max(routes.length, 1);

    return {
      routes,
      unassignedJobs,
      totalScore,
      totalDistanceKm,
      totalDurationHours,
      computationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Optimize route for a single technician using nearest neighbor + 2-opt
   */
  private async optimizeRouteForTechnician(
    jobs: Job[],
    technician: Technician,
    vehicle: Vehicle,
    date: Date,
    constraints: RouteConstraints
  ): Promise<OptimizedRoute | null> {
    const startLocation = technician.homeLocation;
    const endLocation = technician.homeLocation;

    // Build distance matrix
    const locations = [startLocation, ...jobs.map(j => j.location)];
    const distanceMatrix = await this.buildDistanceMatrix(locations);

    // Use nearest neighbor algorithm for initial route
    let route = this.nearestNeighborRoute(jobs, distanceMatrix);

    // Apply 2-opt improvement
    route = this.twoOptImprove(route, distanceMatrix);

    // Create route stops with timing
    const stops = await this.createRouteStops(route, startLocation, distanceMatrix, date);

    // Calculate route metrics
    const totalDistanceKm = stops.reduce((sum, s) => sum + s.distanceFromPreviousKm, 0);
    const totalDurationMinutes = stops.reduce((sum, s) => sum + s.durationFromPreviousMinutes + s.job!.estimatedDurationMinutes, 0);

    // Check constraints
    const warnings: string[] = [];
    if (constraints.maxTotalDistanceKm && totalDistanceKm > constraints.maxTotalDistanceKm) {
      warnings.push(`Route exceeds max distance: ${totalDistanceKm.toFixed(1)} km > ${constraints.maxTotalDistanceKm} km`);
    }

    if (constraints.maxRouteHours && totalDurationMinutes / 60 > constraints.maxRouteHours) {
      warnings.push(`Route exceeds max hours: ${(totalDurationMinutes / 60).toFixed(1)} hrs > ${constraints.maxRouteHours} hrs`);
    }

    // Calculate optimization score (0-100)
    const score = this.calculateRouteScore(route, distanceMatrix, constraints);

    const optimizedRoute: Route = {
      id: uuidv4(),
      date,
      technicianId: technician.id,
      technician,
      vehicleId: vehicle.id,
      vehicle,
      stops,
      status: RouteStatus.PLANNED,
      startLocation,
      endLocation,
      totalDistanceKm,
      totalDurationMinutes,
      optimizationScore: score,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      route: optimizedRoute,
      score,
      warnings,
    };
  }

  /**
   * Nearest neighbor algorithm for initial route construction
   */
  private nearestNeighborRoute(jobs: Job[], distanceMatrix: number[][]): Job[] {
    const route: Job[] = [];
    const remaining = [...jobs];
    let currentIndex = 0; // Start from depot (index 0)

    while (remaining.length > 0) {
      let nearestIndex = -1;
      let nearestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const jobIndex = jobs.indexOf(remaining[i]) + 1; // +1 because depot is at index 0
        const distance = distanceMatrix[currentIndex][jobIndex];

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const nearest = remaining.splice(nearestIndex, 1)[0];
      route.push(nearest);
      currentIndex = jobs.indexOf(nearest) + 1;
    }

    return route;
  }

  /**
   * 2-opt improvement algorithm
   */
  private twoOptImprove(route: Job[], distanceMatrix: number[][]): Job[] {
    let improved = true;
    let bestRoute = [...route];

    while (improved) {
      improved = false;

      for (let i = 0; i < bestRoute.length - 1; i++) {
        for (let j = i + 1; j < bestRoute.length; j++) {
          const newRoute = this.twoOptSwap(bestRoute, i, j);

          if (this.calculateRouteCost(newRoute, distanceMatrix) < this.calculateRouteCost(bestRoute, distanceMatrix)) {
            bestRoute = newRoute;
            improved = true;
          }
        }
      }
    }

    return bestRoute;
  }

  private twoOptSwap(route: Job[], i: number, j: number): Job[] {
    const newRoute = route.slice(0, i);
    const reversed = route.slice(i, j + 1).reverse();
    const rest = route.slice(j + 1);
    return [...newRoute, ...reversed, ...rest];
  }

  private calculateRouteCost(route: Job[], distanceMatrix: number[][]): number {
    let cost = 0;
    let prevIndex = 0; // Start from depot

    for (const job of route) {
      const jobIndex = route.indexOf(job) + 1;
      cost += distanceMatrix[prevIndex][jobIndex];
      prevIndex = jobIndex;
    }

    // Return to depot
    cost += distanceMatrix[prevIndex][0];

    return cost;
  }

  private async buildDistanceMatrix(locations: Location[]): Promise<number[][]> {
    const matrix: number[][] = [];

    for (let i = 0; i < locations.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < locations.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          const entry = await this.distanceService.getDistance(locations[i], locations[j]);
          matrix[i][j] = entry.distanceKm;
        }
      }
    }

    return matrix;
  }

  private async createRouteStops(
    jobs: Job[],
    startLocation: Location,
    distanceMatrix: number[][],
    date: Date
  ): Promise<RouteStop[]> {
    const stops: RouteStop[] = [];
    const startTime = new Date(date);
    startTime.setHours(8, 0, 0, 0); // Start at 8 AM

    let currentTime = startTime;
    let prevIndex = 0;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const jobIndex = i + 1;

      const distanceKm = distanceMatrix[prevIndex][jobIndex];
      const durationMinutes = Math.ceil((distanceKm / 50) * 60); // Assume 50 km/h

      currentTime = addMinutes(currentTime, durationMinutes);

      const stop: RouteStop = {
        jobId: job.id,
        job,
        sequenceNumber: i + 1,
        estimatedArrivalTime: new Date(currentTime),
        estimatedDepartureTime: addMinutes(currentTime, job.estimatedDurationMinutes),
        distanceFromPreviousKm: distanceKm,
        durationFromPreviousMinutes: durationMinutes,
      };

      stops.push(stop);
      currentTime = stop.estimatedDepartureTime;
      prevIndex = jobIndex;
    }

    return stops;
  }

  private calculateRouteScore(jobs: Job[], distanceMatrix: number[][], constraints: RouteConstraints): number {
    let score = 100;

    // Penalize long routes
    const totalDistance = this.calculateRouteCost(jobs, distanceMatrix);
    if (constraints.maxTotalDistanceKm) {
      const distanceRatio = totalDistance / constraints.maxTotalDistanceKm;
      score -= Math.max(0, (distanceRatio - 0.8) * 100);
    }

    // Bonus for efficient routing
    const straightLineDistance = distanceMatrix[0][jobs.length];
    const efficiency = straightLineDistance / totalDistance;
    score += efficiency * 10;

    return Math.max(0, Math.min(100, score));
  }

  private canAssignJob(
    job: Job,
    technician: Technician,
    vehicle: Vehicle,
    constraints: RouteConstraints
  ): boolean {
    // Check skill requirements
    if (constraints.requireSkillMatch) {
      const hasRequiredSkills = job.requiredSkills.every(reqSkill =>
        technician.skills.some(
          techSkill =>
            techSkill.serviceType === reqSkill.serviceType &&
            techSkill.level >= reqSkill.level
        )
      );

      if (!hasRequiredSkills) {
        return false;
      }
    }

    // Check equipment requirements
    if (constraints.requireEquipmentMatch) {
      const hasRequiredEquipment = vehicle.equipmentTypes.includes(job.serviceType);
      if (!hasRequiredEquipment) {
        return false;
      }
    }

    return true;
  }

  private createTechnicianVehiclePairs(
    technicians: Technician[],
    vehicles: Vehicle[]
  ): Array<{ technician: Technician; vehicle: Vehicle }> {
    const pairs: Array<{ technician: Technician; vehicle: Vehicle }> = [];

    for (const technician of technicians) {
      // Find assigned vehicle or first available
      const vehicle = vehicles.find(v => v.assignedTechnicianId === technician.id) || vehicles[0];

      if (vehicle) {
        pairs.push({ technician, vehicle });
      }
    }

    return pairs;
  }
}

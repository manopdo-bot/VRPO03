import { Node, Route, Vehicle } from './types';

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function solveVRP(
  nodes: Node[],
  distanceMatrix: Record<string, Record<string, number>>,
  vehicles: Vehicle[]
): Route[] {
  const depot = nodes.find(n => n.isDepot);
  if (!depot) return [];

  const unvisited = nodes.filter(n => !n.isDepot);
  const routes: Route[] = [];
  let currentVehicleIdx = 0;

  while (unvisited.length > 0 && currentVehicleIdx < vehicles.length) {
    const vehicle = vehicles[currentVehicleIdx];
    const route: Route = {
      vehicleId: vehicle.name,
      capacity: vehicle.capacity,
      path: [depot.id],
      distance: 0,
      load: 0,
      color: COLORS[currentVehicleIdx % COLORS.length],
      fuelCost: 0,
      driverWage: vehicle.driverWage,
      otherExpenses: vehicle.otherExpenses,
      totalCost: 0
    };

    let currentNodeId = depot.id;

    while (unvisited.length > 0) {
      let nextNodeIdx = -1;
      let minDistance = Infinity;

      // Check for fixed sequence nodes first
      const fixedNodes = unvisited.filter(n => n.fixedSequence !== undefined && n.fixedSequence !== null && !isNaN(n.fixedSequence));
      
      if (fixedNodes.length > 0) {
        fixedNodes.sort((a, b) => a.fixedSequence! - b.fixedSequence!);
        const nextFixed = fixedNodes[0];
        
        if (route.load + nextFixed.demand <= vehicle.capacity) {
          nextNodeIdx = unvisited.findIndex(n => n.id === nextFixed.id);
        }
      }

      // Nearest neighbor
      if (nextNodeIdx === -1) {
        for (let i = 0; i < unvisited.length; i++) {
          const candidate = unvisited[i];
          if (candidate.fixedSequence !== undefined && candidate.fixedSequence !== null && !isNaN(candidate.fixedSequence)) continue;

          if (route.load + candidate.demand <= vehicle.capacity) {
            const dist = distanceMatrix[currentNodeId][candidate.id];
            if (dist < minDistance) {
              minDistance = dist;
              nextNodeIdx = i;
            }
          }
        }
      }

      if (nextNodeIdx !== -1) {
        const nextNode = unvisited[nextNodeIdx];
        route.path.push(nextNode.id);
        route.distance += distanceMatrix[currentNodeId][nextNode.id];
        route.load += nextNode.demand;
        currentNodeId = nextNode.id;
        unvisited.splice(nextNodeIdx, 1);
      } else {
        break;
      }
    }

    // Only add route if it actually visited somewhere (distance > 0 or path length > 1)
    if (route.path.length > 1) {
      // Return to depot
      route.distance += distanceMatrix[currentNodeId][depot.id];
      route.path.push(depot.id);
      
      // Calculate costs
      route.fuelCost = route.distance * vehicle.fuelCostPerKm;
      route.totalCost = route.fuelCost + route.driverWage + route.otherExpenses;

      routes.push(route);
    }
    
    currentVehicleIdx++;
  }

  return routes;
}

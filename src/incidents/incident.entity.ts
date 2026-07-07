import { Criticality } from '../common/lib/criticality';

export class Incident {
  id: number;
  title?: string;
  description?: string;
  latitude: number;
  longitude: number;
  deviceDirection: string;
  criticality: Criticality;
  citizenId?: number;
  anonId?: string;
  boOpened: boolean;
  boNumberOrProtocol?: string;
  occurredAt: Date;
  reviewed: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number; // Weak ref
  updatedBy?: number; // Weak ref
}

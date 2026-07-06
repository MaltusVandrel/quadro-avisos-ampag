export class Occurrence {
  id: string;
  description: string;
  photo: string;
  otherPhotos: string[];
  latitude: number;
  longitude: number;
  locationLabel: string;
  deviceDirection: string;
  criticalityId: string;
  citizenId: string;
  validated: boolean;
  boOpened: boolean;
  boNumberOrProtocol?: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  reviewed: boolean;
}

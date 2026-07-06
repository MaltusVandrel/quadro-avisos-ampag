import { Injectable, NotFoundException } from '@nestjs/common';
import { Occurrence } from './occurrence.entity';
import { CitizensService } from '../citizens/citizens.service';
import { CriticalitiesService } from '../criticities/criticities.service';

@Injectable()
export class OccurrencesService {
  private occurrences: Occurrence[] = [];

  constructor(
    private readonly citizensService: CitizensService,
    private readonly criticalitiesService: CriticalitiesService,
  ) {}

  create(data: Omit<Occurrence, 'id' | 'createdAt' | 'updatedAt' | 'reviewed'>): Occurrence {
    const citizen = this.citizensService.findOne(data.citizenId);
    const criticality = this.criticalitiesService.findOne(data.criticalityId);

    if (!citizen) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    if (!criticality) {
      throw new NotFoundException('Criticidade não encontrada');
    }

    const occurrence: Occurrence = {
      id: `${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewed: !data.validated,
      ...data,
      occurredAt: data.occurredAt ?? new Date(),
      validated: data.validated ?? false,
      boOpened: data.boOpened ?? false,
    };

    this.occurrences.push(occurrence);
    return occurrence;
  }

  findAll(includeUnvalidated = false): Occurrence[] {
    if (includeUnvalidated) {
      return this.occurrences;
    }

    return this.occurrences.filter((occurrence) => occurrence.validated || occurrence.reviewed);
  }

  findMapMarkers(): Occurrence[] {
    return this.occurrences.filter((occurrence) => occurrence.validated);
  }

  findOne(id: string): Occurrence | undefined {
    return this.occurrences.find((occurrence) => occurrence.id === id);
  }

  update(id: string, data: Partial<Occurrence>): Occurrence {
    const occurrence = this.findOne(id);

    if (!occurrence) {
      throw new NotFoundException('Ocorrência não encontrada');
    }

    const allowedUpdates = {
      description: data.description,
      otherPhotos: data.otherPhotos,
      boOpened: data.boOpened,
      boNumberOrProtocol: data.boNumberOrProtocol,
    };

    Object.assign(occurrence, allowedUpdates);
    occurrence.updatedAt = new Date();

    return occurrence;
  }
}

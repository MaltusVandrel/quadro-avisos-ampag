import { NotFoundException } from '@nestjs/common';
import { CitizensService } from '../citizens/citizens.service';
import { CriticalitiesService } from '../criticities/criticities.service';
import { OccurrencesService } from './occurrences.service';

describe('OccurrencesService', () => {
  let service: OccurrencesService;
  let citizensService: CitizensService;

  beforeEach(() => {
    citizensService = new CitizensService();
    service = new OccurrencesService(citizensService, new CriticalitiesService());
  });

  it('creates an occurrence with default review state', () => {
    const citizen = citizensService.create({
      name: 'Ana',
      address: 'Rua A',
      age: 30,
      cellphone: '99999-9999',
    });

    const occurrence = service.create({
      description: 'Ocorrência teste',
      photo: 'photo.jpg',
      otherPhotos: [],
      latitude: -20.2,
      longitude: -40.3,
      locationLabel: 'Rua B',
      deviceDirection: 'Norte',
      criticalityId: 'risco',
      citizenId: citizen.id,
      validated: false,
      boOpened: false,
      occurredAt: new Date('2026-01-01T10:00:00Z'),
    });

    expect(occurrence.reviewed).toBe(true);
    expect(occurrence.validated).toBe(false);
  });

  it('allows restricted updates after report', () => {
    const citizen = citizensService.create({
      name: 'Bruno',
      address: 'Rua C',
      age: 28,
      cellphone: '98888-8888',
    });

    const created = service.create({
      description: 'Relato inicial',
      photo: 'photo.jpg',
      otherPhotos: [],
      latitude: -20.1,
      longitude: -40.1,
      locationLabel: 'Rua C',
      deviceDirection: 'Sul',
      criticalityId: 'perigo',
      citizenId: citizen.id,
      validated: true,
      boOpened: false,
      occurredAt: new Date('2026-01-02T09:00:00Z'),
    });

    const updated = service.update(created.id, {
      description: 'Descrição complementada',
      otherPhotos: ['foto2.jpg'],
      boOpened: true,
      boNumberOrProtocol: 'BO-123',
    });

    expect(updated.description).toBe('Descrição complementada');
    expect(updated.otherPhotos).toEqual(['foto2.jpg']);
    expect(updated.boOpened).toBe(true);
    expect(updated.boNumberOrProtocol).toBe('BO-123');
  });

  it('throws for unresolved citizen or criticality references', () => {
    expect(() =>
      service.create({
        description: 'Erro',
        photo: 'x.jpg',
        otherPhotos: [],
        latitude: 0,
        longitude: 0,
        locationLabel: 'Local',
        deviceDirection: 'Leste',
        criticalityId: 'unknown',
        citizenId: 'missing',
        validated: false,
        boOpened: false,
        occurredAt: new Date(),
      }),
    ).toThrow(NotFoundException);
  });
});

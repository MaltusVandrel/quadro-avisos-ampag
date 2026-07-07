import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CitizensService } from '../citizens/citizens.service';
import { Criticality } from '../common/lib/criticality';
import { IncidentsService } from './incidents.service';

jest.mock('../citizens/citizens.service', () => {
  return {
    CitizensService: jest.fn().mockImplementation(() => ({
      findOne: jest.fn(() =>
        Promise.resolve({
          id: 1,
          cpf: '12345678901',
          name: 'Test Citizen',
          anonId: 'anon-test',
        }),
      ),
    })),
  };
});

jest.mock('../database/connection', () => {
  let storedIncident: any = null;

  return {
    db: {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve(storedIncident ? [storedIncident] : [])),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        values: jest.fn((values: any) => {
          storedIncident = {
            id: 1,
            title: values.title ?? null,
            description: values.description ?? null,
            latitude: values.latitude,
            longitude: values.longitude,
            deviceDirection: values.deviceDirection ?? null,
            criticality: values.criticality,
            citizenId: values.citizenId ?? null,
            anonId: values.anonId ?? null,
            boOpened: values.boOpened,
            boNumberOrProtocol: values.boNumberOrProtocol ?? null,
            occurredAt: values.occurredAt,
            reviewed: values.reviewed,
            active: values.active,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: values.createdBy ?? null,
            updatedBy: values.updatedBy ?? null,
          };
          return {
            returning: jest.fn(() => Promise.resolve([storedIncident])),
          };
        }),
      })),
      update: jest.fn(() => ({
        set: jest.fn((values: any) => {
          storedIncident = { ...storedIncident, ...values };
          return {
            where: jest.fn(() => ({
              returning: jest.fn(() => Promise.resolve([storedIncident])),
            })),
          };
        }),
      })),
    },
  };
});

describe('IncidentsService', () => {
  let service: IncidentsService;
  let citizensService: CitizensService;

  beforeEach(() => {
    citizensService = new CitizensService();
    service = new IncidentsService(citizensService);
  });

  async function createCitizen(name: string) {
    return {
      id: 1,
      cpf: '12345678901',
      name,
      anonId: `anon-${name}`,
    };
  }

  function buildIncidentData(overrides: Record<string, unknown> = {}) {
    return {
      title: 'Título',
      description: 'Descrição',
      latitude: 0,
      longitude: 0,
      deviceDirection: 'Norte',
      criticality: Criticality.RELATO,
      citizenId: 0,
      anonId: '',
      boOpened: false,
      occurredAt: new Date(),
      active: true,
      createdBy: 1,
      updatedBy: 1,
      fileIds: ['file-1'],
      ...overrides,
    };
  }

  it('creates an incident with default review state', async () => {
    const citizen = await createCitizen('Ana');

    const incident = await service.create(
      buildIncidentData({
        description: 'Ocorrência teste',
        latitude: -20.2,
        longitude: -40.3,
        deviceDirection: 'Norte',
        criticality: Criticality.RISCO,
        citizenId: citizen.id,
        anonId: citizen.anonId,
        occurredAt: new Date('2026-01-01T10:00:00Z'),
      }),
    );

    expect(incident.reviewed).toBe(false);
  });

  it('allows restricted updates after report', async () => {
    const citizen = await createCitizen('Bruno');

    const created = await service.create(
      buildIncidentData({
        description: 'Relato inicial',
        latitude: -20.1,
        longitude: -40.1,
        deviceDirection: 'Sul',
        criticality: Criticality.PERIGO,
        citizenId: citizen.id,
        anonId: citizen.anonId,
        occurredAt: new Date('2026-01-02T09:00:00Z'),
      }),
    );

    const updated = await service.update(created.id, {
      description: 'Descrição complementada',
      boOpened: true,
      boNumberOrProtocol: 'BO-123',
    });

    expect(updated.description).toBe('Relato inicial');
    expect(updated.boOpened).toBe(true);
    expect(updated.boNumberOrProtocol).toBe('BO-123');
  });

  it('creates an incident with only minimal data', async () => {
    const citizen = await createCitizen('Carlos');

    const incident = await service.create({
      latitude: -20.2,
      longitude: -40.3,
      deviceDirection: 'Norte',
      criticality: Criticality.RELATO,
      citizenId: citizen.id,
      anonId: citizen.anonId,
      occurredAt: new Date('2026-01-03T08:00:00Z'),
      fileIds: ['file-2'],
    } as any);

    expect(incident.id).toBeDefined();
    expect(incident.title).toBeUndefined();
    expect(incident.description).toBeUndefined();
    expect(incident.reviewed).toBe(false);
    expect(incident.active).toBe(true);
  });

  it('allows editing title and description when they are empty', async () => {
    const citizen = await createCitizen('Diana');

    const created = await service.create({
      latitude: -20.2,
      longitude: -40.3,
      deviceDirection: 'Norte',
      criticality: Criticality.RELATO,
      citizenId: citizen.id,
      anonId: citizen.anonId,
      occurredAt: new Date(),
      fileIds: ['file-3'],
    } as any);

    const updated = await service.update(created.id, {
      title: 'Título preenchido',
      description: 'Descrição preenchida',
    });

    expect(updated.title).toBe('Título preenchido');
    expect(updated.description).toBe('Descrição preenchida');
  });

  it('does not overwrite title or description when they already have values', async () => {
    const citizen = await createCitizen('Eduardo');

    const created = await service.create(
      buildIncidentData({
        title: 'Título original',
        description: 'Descrição original',
        citizenId: citizen.id,
        anonId: citizen.anonId,
      }),
    );

    const updated = await service.update(created.id, {
      title: 'Título novo',
      description: 'Descrição nova',
    });

    expect(updated.title).toBe('Título original');
    expect(updated.description).toBe('Descrição original');
  });

  it('throws for unresolved citizen or invalid criticality', async () => {
    await expect(
      service.create(
        buildIncidentData({
          description: 'Erro',
          criticality: 'unknown' as Criticality,
          citizenId: 999,
          anonId: 'missing',
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws when no photo is provided', async () => {
    await expect(
      service.create(
        buildIncidentData({
          citizenId: 1,
          fileIds: [],
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

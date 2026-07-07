import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CitizensService } from '../citizens/citizens.service';
import { Criticality } from '../common/lib/criticality';
import { IncidentsService } from './incidents.service';
import { db } from '../database/connection';

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
  let filesStore: any[] = [];

  function isIncidentsTable(table: any) {
    return table && (table.name === 'incidents' || table.reviewed !== undefined);
  }

  function isUploadcareFilesTable(table: any) {
    return table && (table.name === 'uploadcare_files' || table.incidentId !== undefined);
  }

  return {
    db: {
      select: jest.fn(() => ({
        from: jest.fn((table: any) => ({
          where: jest.fn(() => {
            if (isIncidentsTable(table)) {
              return {
                limit: jest.fn(() => Promise.resolve(storedIncident ? [storedIncident] : [])),
              };
            }
            if (isUploadcareFilesTable(table)) {
              return Promise.resolve(filesStore);
            }
            return Promise.resolve([]);
          }),
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
      update: jest.fn((table: any) => ({
        set: jest.fn((values: any) => ({
          where: jest.fn(() => {
            if (isIncidentsTable(table)) {
              storedIncident = { ...storedIncident, ...values };
              return {
                returning: jest.fn(() => Promise.resolve([storedIncident])),
              };
            }
            return {
              returning: jest.fn(() => Promise.resolve([])),
            };
          }),
        })),
      })),
      __setFilesStore(store: any[]) {
        filesStore = store;
      },
      __reset() {
        storedIncident = null;
        filesStore = [];
      },
    },
  };
});

describe('IncidentsService', () => {
  let service: IncidentsService;
  let citizensService: CitizensService;

  beforeEach(() => {
    citizensService = new CitizensService();
    service = new IncidentsService(citizensService);
    (db as any).__reset();
    (db as any).__setFilesStore([{ fileId: 'file-1', incidentId: 1, fileUrl: 'https://example.com/file-1.jpg' }]);
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

  it('allows full update before review by owner', async () => {
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
      latitude: -20.5,
      longitude: -40.5,
      criticality: Criticality.RISCO,
      citizenId: citizen.id,
      anonId: citizen.anonId,
    });

    expect(updated.description).toBe('Descrição complementada');
    expect(updated.boOpened).toBe(true);
    expect(updated.boNumberOrProtocol).toBe('BO-123');
    expect(updated.latitude).toBe(-20.5);
    expect(updated.longitude).toBe(-40.5);
    expect(updated.criticality).toBe(Criticality.RISCO);
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
      citizenId: citizen.id,
      anonId: citizen.anonId,
    });

    expect(updated.title).toBe('Título preenchido');
    expect(updated.description).toBe('Descrição preenchida');
  });

  it('allows overwriting title and description during edit', async () => {
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
      citizenId: citizen.id,
      anonId: citizen.anonId,
    });

    expect(updated.title).toBe('Título novo');
    expect(updated.description).toBe('Descrição nova');
  });

  it('throws when editing an already reviewed incident', async () => {
    const citizen = await createCitizen('Fernanda');

    const created = await service.create(
      buildIncidentData({
        citizenId: citizen.id,
        anonId: citizen.anonId,
      }),
    );

    await service.approve(created.id);

    await expect(
      service.update(created.id, {
        title: 'Novo título',
        citizenId: citizen.id,
        anonId: citizen.anonId,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws when editing without permission', async () => {
    const citizen = await createCitizen('Gabriel');

    const created = await service.create(
      buildIncidentData({
        citizenId: citizen.id,
        anonId: citizen.anonId,
      }),
    );

    await expect(
      service.update(created.id, {
        title: 'Novo título',
        citizenId: 999,
        anonId: 'anon-intruso',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws when trying to remove all photos', async () => {
    const citizen = await createCitizen('Helena');

    const created = await service.create(
      buildIncidentData({
        citizenId: citizen.id,
        anonId: citizen.anonId,
      }),
    );

    await expect(
      service.update(created.id, {
        fileIds: [],
        citizenId: citizen.id,
        anonId: citizen.anonId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts photo synchronization during edit', async () => {
    const citizen = await createCitizen('Igor');

    const created = await service.create(
      buildIncidentData({
        citizenId: citizen.id,
        anonId: citizen.anonId,
      }),
    );

    const updated = await service.update(created.id, {
      fileIds: ['file-1', 'file-2'],
      citizenId: citizen.id,
      anonId: citizen.anonId,
    });

    expect(updated.id).toBe(created.id);
  });

  it('returns occurredAt as UTC ISO string', async () => {
    const citizen = await createCitizen('Julia');

    const created = await service.create(
      buildIncidentData({
        citizenId: citizen.id,
        anonId: citizen.anonId,
        occurredAt: new Date('2026-01-10T10:00:00.000Z'),
      }),
    );

    expect(created.occurredAt?.toISOString()).toBe('2026-01-10T10:00:00.000Z');
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

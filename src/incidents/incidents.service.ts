import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, gte, inArray, lte, or } from 'drizzle-orm';
import { db } from '../database/connection';
import { incidents, uploadcareFiles } from '../database/schema';
import { Incident } from './incident.entity';
import { CitizensService } from '../citizens/citizens.service';
import { Criticality, isCriticality } from '../common/lib/criticality';

function toUtcDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return new Date(value.toISOString());
  const str = String(value);
  const date = /Z$|[+-]\d{2}:\d{2}$/.test(str) ? new Date(str) : new Date(`${str}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export interface CreateIncidentInput extends Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'reviewed'> {
  fileIds?: string[];
}

export interface UpdateIncidentInput extends Partial<Incident> {
  fileIds?: string[];
  citizenId?: number;
  anonId?: string;
  isAdmin?: boolean;
}

export interface MapFilters {
  north: number;
  south: number;
  east: number;
  west: number;
  days?: number;
  citizenId?: number;
  anonId?: string;
  isAdmin?: boolean;
  criticalities?: Criticality[];
  pendingOnly?: boolean;
  mineOnly?: boolean;
}

@Injectable()
export class IncidentsService {
  constructor(private readonly citizensService: CitizensService) {}

  async create(data: CreateIncidentInput): Promise<Incident> {
    if (data.citizenId) {
      const citizen = await this.citizensService.findOne(data.citizenId);
      if (!citizen) {
        throw new NotFoundException('Cidadão não encontrado');
      }
    } else if (!data.anonId) {
      throw new NotFoundException('É necessário informar o cidadão ou o anonId');
    }

    if (!isCriticality(data.criticality)) {
      throw new NotFoundException('Criticidade inválida');
    }

    const hasText = Boolean(data.title) || Boolean(data.description);
    const hasPhoto = data.fileIds && data.fileIds.length > 0;

    if (!hasText && !hasPhoto) {
      throw new BadRequestException('Envie pelo menos uma foto ou preencha título e descrição');
    }

    const [result] = await db
      .insert(incidents)
      .values({
        title: data.title,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        deviceDirection: data.deviceDirection,
        criticality: data.criticality,
        citizenId: data.citizenId,
        anonId: data.anonId,
        boOpened: data.boOpened ?? false,
        boNumberOrProtocol: data.boNumberOrProtocol,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        reviewed: false,
        active: data.active ?? true,
      })
      .returning();

    if (data.fileIds && data.fileIds.length > 0) {
      await db
        .update(uploadcareFiles)
        .set({ incidentId: result.id })
        .where(inArray(uploadcareFiles.fileId, data.fileIds));
    }

    return this.mapToEntity(result);
  }

  async findAll(includeUnreviewed = false): Promise<Incident[]> {
    const rows = includeUnreviewed
      ? await db.select().from(incidents)
      : await db.select().from(incidents).where(eq(incidents.reviewed, true));

    return rows.map((row) => this.mapToEntity(row));
  }

  async findForMap(filters: MapFilters): Promise<Incident[]> {
    const conditions = [
      eq(incidents.active, true),
    ];

    if (filters.days) {
      const startDate = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000);
      conditions.push(gte(incidents.occurredAt, startDate));
    }

    conditions.push(
      gte(incidents.latitude, filters.south),
      lte(incidents.latitude, filters.north),
      gte(incidents.longitude, filters.west),
      lte(incidents.longitude, filters.east),
    );

    if (filters.criticalities && filters.criticalities.length > 0) {
      conditions.push(inArray(incidents.criticality, filters.criticalities));
    }

    if (filters.pendingOnly && filters.isAdmin) {
      conditions.push(eq(incidents.reviewed, false));
    }

    if (filters.mineOnly) {
      const mineConditions = [
        filters.citizenId ? eq(incidents.citizenId, filters.citizenId) : undefined,
        filters.anonId ? eq(incidents.anonId, filters.anonId) : undefined,
      ].filter(Boolean);

      if (mineConditions.length === 0) {
        return [];
      }

      conditions.push(or(...mineConditions));
    } else if (!filters.isAdmin) {
      const permissionFilter = filters.citizenId
        ? or(
            eq(incidents.reviewed, true),
            eq(incidents.citizenId, filters.citizenId),
            filters.anonId ? eq(incidents.anonId, filters.anonId) : undefined,
          )
        : or(
            eq(incidents.reviewed, true),
            filters.anonId ? eq(incidents.anonId, filters.anonId) : undefined,
          );

      conditions.push(permissionFilter);
    }

    const rows = await db
      .select()
      .from(incidents)
      .where(and(...conditions));

    return rows.map((row) => this.mapToEntity(row));
  }

  async findOne(id: number): Promise<Incident | undefined> {
    const [row] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
    return row ? this.mapToEntity(row) : undefined;
  }

  async update(id: number, data: UpdateIncidentInput): Promise<Incident> {
    const existing = await this.findOne(id);

    if (!existing) {
      throw new NotFoundException('Ocorrência não encontrada');
    }

    if (existing.reviewed) {
      throw new ForbiddenException('Ocorrências aprovadas não podem ser editadas');
    }

    const isOwnerByCitizen = data.citizenId != null && existing.citizenId === data.citizenId;
    const isOwnerByAnon = data.anonId != null && existing.anonId === data.anonId;

    if (!data.isAdmin && !isOwnerByCitizen && !isOwnerByAnon) {
      throw new ForbiddenException('Você não tem permissão para editar esta ocorrência');
    }

    const values: Partial<typeof incidents.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) {
      values.title = data.title || null;
    }

    if (data.description !== undefined) {
      values.description = data.description || null;
    }

    if (data.latitude !== undefined) {
      values.latitude = data.latitude;
    }

    if (data.longitude !== undefined) {
      values.longitude = data.longitude;
    }

    if (data.criticality !== undefined) {
      if (!isCriticality(data.criticality)) {
        throw new BadRequestException('Criticidade inválida');
      }
      values.criticality = data.criticality;
    }

    if (data.occurredAt !== undefined) {
      values.occurredAt = new Date(data.occurredAt);
    }

    if (data.boOpened !== undefined) {
      values.boOpened = data.boOpened;
    }

    if (data.boNumberOrProtocol !== undefined) {
      values.boNumberOrProtocol = data.boNumberOrProtocol || null;
    }

    const [result] = await db
      .update(incidents)
      .set(values)
      .where(eq(incidents.id, id))
      .returning();

    if (data.fileIds !== undefined) {
      const hasText = Boolean(data.title) || Boolean(data.description) || Boolean(existing.title) || Boolean(existing.description);
      await this.syncIncidentFiles(id, data.fileIds, hasText);
    }

    return this.mapToEntity(result);
  }

  private async syncIncidentFiles(
    id: number,
    fileIds: string[],
    hasText: boolean,
  ): Promise<void> {
    if (fileIds.length === 0 && !hasText) {
      throw new BadRequestException('É necessário manter pelo menos uma foto ou preencher título e descrição');
    }

    const currentFiles = await db
      .select()
      .from(uploadcareFiles)
      .where(eq(uploadcareFiles.incidentId, id));

    const removedFileIds = currentFiles
      .filter((file) => !fileIds.includes(file.fileId))
      .map((file) => file.fileId);

    if (removedFileIds.length > 0) {
      await db
        .update(uploadcareFiles)
        .set({ incidentId: null })
        .where(inArray(uploadcareFiles.fileId, removedFileIds));
    }

    if (fileIds.length > 0) {
      await db
        .update(uploadcareFiles)
        .set({ incidentId: id })
        .where(inArray(uploadcareFiles.fileId, fileIds));
    }

    const remainingFiles = await db
      .select()
      .from(uploadcareFiles)
      .where(eq(uploadcareFiles.incidentId, id));

    if (remainingFiles.length === 0 && !hasText) {
      throw new BadRequestException('É necessário manter pelo menos uma foto válida ou preencher título e descrição');
    }
  }

  async approve(id: number): Promise<Incident> {
    const existing = await this.findOne(id);

    if (!existing) {
      throw new NotFoundException('Ocorrência não encontrada');
    }

    const [result] = await db
      .update(incidents)
      .set({ reviewed: true, updatedAt: new Date() })
      .where(eq(incidents.id, id))
      .returning();

    return this.mapToEntity(result);
  }

  async deactivate(
    id: number,
    options: { citizenId?: number; anonId?: string; isAdmin?: boolean } = {},
  ): Promise<Incident> {
    const existing = await this.findOne(id);

    if (!existing) {
      throw new NotFoundException('Ocorrência não encontrada');
    }

    if (options.isAdmin) {
      // Admin pode remover qualquer ocorrência.
    } else if (!existing.reviewed) {
      const isOwnerByCitizen = options.citizenId != null && existing.citizenId === options.citizenId;
      const isOwnerByAnon = options.anonId != null && existing.anonId === options.anonId;
      if (!isOwnerByCitizen && !isOwnerByAnon) {
        throw new ForbiddenException('Você não tem permissão para remover esta ocorrência');
      }
    } else {
      throw new ForbiddenException('Ocorrências aprovadas só podem ser removidas por um administrador');
    }

    const [result] = await db
      .update(incidents)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(incidents.id, id))
      .returning();

    return this.mapToEntity(result);
  }

  private mapToEntity(row: typeof incidents.$inferSelect): Incident {
    return {
      id: row.id,
      title: row.title ?? undefined,
      description: row.description ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      deviceDirection: row.deviceDirection ?? undefined,
      criticality: row.criticality as Criticality,
      citizenId: row.citizenId ?? undefined,
      anonId: row.anonId ?? undefined,
      boOpened: row.boOpened,
      boNumberOrProtocol: row.boNumberOrProtocol ?? undefined,
      occurredAt: toUtcDate(row.occurredAt),
      reviewed: row.reviewed,
      active: row.active,
      createdAt: toUtcDate(row.createdAt),
      updatedAt: toUtcDate(row.updatedAt),
      createdBy: row.createdBy ?? undefined,
      updatedBy: row.updatedBy ?? undefined,
    };
  }
}

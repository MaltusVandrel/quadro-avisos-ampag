import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, gte, inArray, lte, or } from 'drizzle-orm';
import { db } from '../database/connection';
import { incidents, uploadcareFiles } from '../database/schema';
import { Incident } from './incident.entity';
import { CitizensService } from '../citizens/citizens.service';
import { Criticality, isCriticality } from '../common/lib/criticality';

export interface CreateIncidentInput extends Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'reviewed'> {
  fileIds?: string[];
}

export interface MapFilters {
  north: number;
  south: number;
  east: number;
  west: number;
  citizenId?: number;
  anonId?: string;
  isAdmin?: boolean;
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

    if (!data.fileIds || data.fileIds.length === 0) {
      throw new BadRequestException('É necessário enviar pelo menos uma foto');
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
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    const permissionFilter = filters.isAdmin
      ? undefined
      : filters.citizenId
        ? or(
            eq(incidents.reviewed, true),
            eq(incidents.citizenId, filters.citizenId),
            filters.anonId ? eq(incidents.anonId, filters.anonId) : undefined,
          )
        : or(
            eq(incidents.reviewed, true),
            filters.anonId ? eq(incidents.anonId, filters.anonId) : undefined,
          );

    const conditions = [
      gte(incidents.occurredAt, fifteenDaysAgo),
      eq(incidents.active, true),
      gte(incidents.latitude, filters.south),
      lte(incidents.latitude, filters.north),
      gte(incidents.longitude, filters.west),
      lte(incidents.longitude, filters.east),
    ];

    if (permissionFilter) {
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

  async update(id: number, data: Partial<Incident>): Promise<Incident> {
    const existing = await this.findOne(id);

    if (!existing) {
      throw new NotFoundException('Ocorrência não encontrada');
    }

    const values: Partial<typeof incidents.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined && !existing.title) {
      values.title = data.title;
    }

    if (data.description !== undefined && !existing.description) {
      values.description = data.description;
    }

    if (data.boOpened !== undefined) {
      values.boOpened = data.boOpened;
    }

    if (data.boNumberOrProtocol !== undefined) {
      values.boNumberOrProtocol = data.boNumberOrProtocol;
    }

    const [result] = await db
      .update(incidents)
      .set(values)
      .where(eq(incidents.id, id))
      .returning();

    return this.mapToEntity(result);
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
      occurredAt: row.occurredAt,
      reviewed: row.reviewed,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy ?? undefined,
      updatedBy: row.updatedBy ?? undefined,
    };
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../database/connection';
import { citizens } from '../database/schema';
import { Citizen } from './citizen.entity';
import { hashPassword, verifyPassword } from '../common/lib/password';

export type CreateCitizenInput = {
  cpf: string;
  password: string;
  name: string;
  address?: string;
  birthAt?: Date | string;
  email?: string;
  cellphone?: string;
  anonId?: string;
};

export type UpdateCitizenInput = {
  name?: string;
  birthAt?: Date | string;
  email?: string;
  cellphone?: string;
  address?: string;
};

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '').slice(0, 11);
}

@Injectable()
export class CitizensService {
  async create(data: CreateCitizenInput): Promise<Citizen> {
    const cpf = normalizeCpf(data.cpf);

    if (cpf.length !== 11) {
      throw new ConflictException('CPF inválido');
    }

    const [existing] = await db
      .select()
      .from(citizens)
      .where(eq(citizens.cpf, cpf))
      .limit(1);

    if (existing) {
      throw new ConflictException('CPF já cadastrado');
    }

    if (data.anonId) {
      const [existingAnon] = await db
        .select()
        .from(citizens)
        .where(eq(citizens.anonId, data.anonId))
        .limit(1);
      if (existingAnon) {
        throw new ConflictException('anonId já vinculado a outra conta');
      }
    }

    const passwordHash = hashPassword(data.password);

    const [result] = await db
      .insert(citizens)
      .values({
        cpf,
        password: passwordHash,
        name: data.name,
        address: data.address,
        birthAt: data.birthAt ? new Date(data.birthAt) : undefined,
        email: data.email,
        cellphone: data.cellphone,
        anonId: data.anonId,
      })
      .returning();

    return this.mapToEntity(result);
  }

  async findAll(): Promise<Citizen[]> {
    const rows = await db.select().from(citizens);
    return rows.map((row) => this.mapToEntity(row));
  }

  async findOne(id: number): Promise<Citizen | undefined> {
    const [row] = await db.select().from(citizens).where(eq(citizens.id, id)).limit(1);
    return row ? this.mapToEntity(row) : undefined;
  }

  async findByCpf(cpf: string): Promise<Citizen | undefined> {
    const normalized = normalizeCpf(cpf);
    const [row] = await db
      .select()
      .from(citizens)
      .where(eq(citizens.cpf, normalized))
      .limit(1);
    return row ? this.mapToEntity(row) : undefined;
  }

  async findByAnonId(anonId: string): Promise<Citizen | undefined> {
    const [row] = await db
      .select()
      .from(citizens)
      .where(eq(citizens.anonId, anonId))
      .limit(1);
    return row ? this.mapToEntity(row) : undefined;
  }

  async update(id: number, data: UpdateCitizenInput): Promise<Citizen> {
    const values: Partial<typeof citizens.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) values.name = data.name;
    if (data.birthAt !== undefined) {
      values.birthAt = data.birthAt ? new Date(data.birthAt) : null;
    }
    if (data.email !== undefined) values.email = data.email;
    if (data.cellphone !== undefined) values.cellphone = data.cellphone;
    if (data.address !== undefined) values.address = data.address;

    const [result] = await db
      .update(citizens)
      .set(values)
      .where(eq(citizens.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    return this.mapToEntity(result);
  }

  async validatePassword(cpf: string, password: string): Promise<Citizen | undefined> {
    const citizen = await this.findByCpf(cpf);
    if (!citizen) return undefined;
    const valid = verifyPassword(password, citizen.password);
    return valid ? citizen : undefined;
  }

  async resetPassword(cpf: string, birthAt: string | Date, newPassword: string): Promise<Citizen> {
    const normalizedCpf = normalizeCpf(cpf);
    const [citizen] = await db
      .select()
      .from(citizens)
      .where(eq(citizens.cpf, normalizedCpf))
      .limit(1);

    if (!citizen) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    if (!citizen.birthAt) {
      throw new NotFoundException('Data de nascimento não cadastrada');
    }

    const inputDate = new Date(birthAt).toISOString().slice(0, 10);
    const storedDate = new Date(citizen.birthAt).toISOString().slice(0, 10);

    if (inputDate !== storedDate) {
      throw new NotFoundException('Dados não conferem');
    }

    const passwordHash = hashPassword(newPassword);

    const [result] = await db
      .update(citizens)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(citizens.id, citizen.id))
      .returning();

    return this.mapToEntity(result);
  }

  private mapToEntity(row: (typeof citizens.$inferSelect)): Citizen {
    return {
      id: row.id,
      cpf: row.cpf,
      password: row.password,
      name: row.name,
      address: row.address ?? undefined,
      birthAt: row.birthAt ?? undefined,
      email: row.email ?? undefined,
      cellphone: row.cellphone ?? undefined,
      anonId: row.anonId ?? undefined,
      role: row.role,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy ?? undefined,
      updatedBy: row.updatedBy ?? undefined,
    };
  }
}

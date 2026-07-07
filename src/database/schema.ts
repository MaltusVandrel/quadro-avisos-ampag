import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  real,
} from 'drizzle-orm/pg-core';
import { Criticality } from '../common/lib/criticality';

export const criticalityEnum = pgEnum('criticality', [
  Criticality.RELATO,
  Criticality.TRANSTORNO,
  Criticality.RISCO,
  Criticality.PERIGO,
]);

const genericSchema = {
  id: serial('id').primaryKey(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by'), // Weak ref
  updatedBy: integer('updated_by'), // Weak ref
};

export const citizens = pgTable('citizens', {
  ...genericSchema,
  cpf: varchar('cpf', { length: 11 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 255 }),
  birthAt: timestamp('birth_at'),
  anonId: varchar('anon_id', { length: 255 }).unique(),
  cellphone: varchar('cellphone', { length: 20 }),
  email: varchar('email', { length: 255 }).unique(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
});

export const incidents = pgTable('incidents', {
  ...genericSchema,
  title: varchar('title', { length: 255 }),
  description: text('description'),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  deviceDirection: varchar('device_direction', { length: 20 }),
  criticality: criticalityEnum('criticality').notNull(),
  citizenId: integer('citizen_id').references(() => citizens.id),
  anonId: varchar('anon_id', { length: 255 }),
  boOpened: boolean('bo_opened').notNull().default(false),
  boNumberOrProtocol: varchar('bo_number_or_protocol', { length: 100 }),
  occurredAt: timestamp('occurred_at').notNull(),
  reviewed: boolean('reviewed').notNull().default(false),
});

export const uploadcareFiles = pgTable('uploadcare_files', {
  id: serial('id').primaryKey(),
  fileId: text('file_id').notNull().unique(),
  fileUrl: text('file_url').notNull(),
  userId: text('user_id').notNull(),
  incidentId: integer('incident_id').references(() => incidents.id),
  uploadTimestamp: timestamp('upload_timestamp', { withTimezone: true }).defaultNow(),
});

export type Citizen = typeof citizens.$inferSelect;
export type NewCitizen = typeof citizens.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
export type UploadcareFile = typeof uploadcareFiles.$inferSelect;
export type NewUploadcareFile = typeof uploadcareFiles.$inferInsert;

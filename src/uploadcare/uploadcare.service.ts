import { Injectable, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../database/connection';
import { uploadcareFiles } from '../database/schema';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  id: number;
  fileId: string;
  fileUrl: string;
  incidentId: number | null;
}

@Injectable()
export class UploadcareService {
  private readonly publicKey: string;
   private readonly subdomain: string;
  private readonly uploadUrl = 'https://upload.uploadcare.com/base/';

  constructor() {
    const key = process.env.UPLOADCARE_PUBLIC_KEY;
    const subdomain = process.env.UPLOADCARE_CDN_SUBDOMAIN;
    if (!key) {
      throw new Error('UPLOADCARE_PUBLIC_KEY is not defined. Please set it in your .env file.');
    }
    if (!subdomain) {
      throw new Error('UPLOADCARE_CDN_SUBDOMAIN is not defined. Please set it in your .env file.');
    }
    this.publicKey = key;
    this.subdomain = subdomain;
  }

  async upload(file: UploadedFile, options: { incidentId?: number; userId?: string } = {}): Promise<UploadResult> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Arquivo não fornecido');
    }

     
    const formData = new FormData();
    formData.append('UPLOADCARE_PUB_KEY', this.publicKey);
    formData.append('UPLOADCARE_STORE', '1');
    formData.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'application/octet-stream' }),
      file.originalname || 'file',
    );

    const startedAt = Date.now();
    const response = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData as unknown as BodyInit,
    });
    const duration = Date.now() - startedAt;

    
    if (!response.ok) {
      const text = await response.text().catch(() => 'Uploadcare upload failed');
       
      throw new BadRequestException(`Falha no upload: ${text}`);
    }

    const result = (await response.json()) as Record<string, string>;
    const fileId = Object.values(result)[0];
    
    if (!fileId) {
      throw new BadRequestException('Resposta inválida do Uploadcare');
    }

    

    const fileUrl = `https://${this.subdomain}.ucarecd.net/${fileId}/`;

    const [record] = await db
      .insert(uploadcareFiles)
      .values({
        fileId,
        fileUrl,
        userId: options.userId ?? 'anonymous',
        incidentId: options.incidentId,
      })
      .returning();

    return {
      id: record.id,
      fileId: record.fileId,
      fileUrl: record.fileUrl,
      incidentId: record.incidentId,
    };
  }

  async findByIncident(incidentId: number): Promise<UploadResult[]> {
    const rows = await db
      .select()
      .from(uploadcareFiles)
      .where(eq(uploadcareFiles.incidentId, incidentId));

    return rows.map((row) => ({
      id: row.id,
      fileId: row.fileId,
      fileUrl: row.fileUrl,
      incidentId: row.incidentId,
    }));
  }
}

import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadcareService, UploadResult } from './uploadcare.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller('uploads')
export class UploadcareController {
  constructor(private readonly uploadcareService: UploadcareService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: MulterFile,
    @Query('incidentId') incidentId?: string,
    @CurrentUser('sub') userId?: number,
  ): Promise<UploadResult> {
    return this.uploadcareService.upload(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      {
        incidentId: incidentId ? Number(incidentId) : undefined,
        userId: userId ? String(userId) : undefined,
      },
    );
  }

  @Get()
  async findByIncident(@Query('incidentId') incidentId: string): Promise<UploadResult[]> {
    return this.uploadcareService.findByIncident(Number(incidentId));
  }
}

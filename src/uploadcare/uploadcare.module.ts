import { Module } from '@nestjs/common';
import { UploadcareController } from './uploadcare.controller';
import { UploadcareService } from './uploadcare.service';

@Module({
  controllers: [UploadcareController],
  providers: [UploadcareService],
  exports: [UploadcareService],
})
export class UploadcareModule {}

import { Module } from '@nestjs/common';
import { CriticalitiesService } from './criticities.service';
import { CriticalitiesController } from './criticities.controller';

@Module({
  controllers: [CriticalitiesController],
  providers: [CriticalitiesService],
  exports: [CriticalitiesService],
})
export class CriticalitiesModule {}

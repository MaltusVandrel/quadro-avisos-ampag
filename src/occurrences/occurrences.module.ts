import { Module } from '@nestjs/common';
import { OccurrencesService } from './occurrences.service';
import { OccurrencesController } from './occurrences.controller';
import { CitizensModule } from '../citizens/citizens.module';
import { CriticalitiesModule } from '../criticities/criticities.module';

@Module({
  imports: [CitizensModule, CriticalitiesModule],
  controllers: [OccurrencesController],
  providers: [OccurrencesService],
  exports: [OccurrencesService],
})
export class OccurrencesModule {}

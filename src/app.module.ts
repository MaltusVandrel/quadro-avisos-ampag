import { Module } from '@nestjs/common';
import { CitizensModule } from './citizens/citizens.module';
import { CriticalitiesModule } from './criticities/criticities.module';
import { OccurrencesModule } from './occurrences/occurrences.module';
import { AppController } from './app.controller';

@Module({
  imports: [CitizensModule, CriticalitiesModule, OccurrencesModule],
  controllers: [AppController],
})
export class AppModule {}

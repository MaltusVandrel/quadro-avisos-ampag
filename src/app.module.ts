import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CitizensModule } from './citizens/citizens.module';
import { IncidentsModule } from './incidents/incidents.module';
import { AuthModule } from './auth/auth.module';
import { UploadcareModule } from './uploadcare/uploadcare.module';
import { AppController } from './app.controller';
import { AuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [CitizensModule, IncidentsModule, AuthModule, UploadcareModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}

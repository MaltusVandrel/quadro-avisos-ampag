import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { CitizensModule } from '../citizens/citizens.module';

@Module({
  imports: [CitizensModule],
  controllers: [AuthController],
})
export class AuthModule {}

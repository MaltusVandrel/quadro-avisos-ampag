import { Controller, Get, Param } from '@nestjs/common';
import { CriticalitiesService } from './criticities.service';

@Controller('criticalities')
export class CriticalitiesController {
  constructor(private readonly criticalitiesService: CriticalitiesService) {}

  @Get()
  findAll() {
    return this.criticalitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.criticalitiesService.findOne(id);
  }
}

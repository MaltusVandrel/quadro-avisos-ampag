import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OccurrencesService } from './occurrences.service';
import { Occurrence } from './occurrence.entity';

@Controller('occurrences')
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  @Post()
  create(@Body() body: Omit<Occurrence, 'id' | 'createdAt' | 'updatedAt' | 'reviewed'>) {
    return this.occurrencesService.create(body);
  }

  @Get()
  findAll(@Query('includeUnvalidated') includeUnvalidated?: string) {
    return this.occurrencesService.findAll(includeUnvalidated === 'true');
  }

  @Get('map')
  findMapMarkers() {
    return this.occurrencesService.findMapMarkers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.occurrencesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Occurrence>) {
    return this.occurrencesService.update(id, body);
  }
}

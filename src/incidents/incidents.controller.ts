import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IncidentsService, MapFilters, CreateIncidentInput } from './incidents.service';
import { Incident } from './incident.entity';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  async create(@Body() body: CreateIncidentInput) {
    return this.incidentsService.create(body);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Query('includeUnreviewed') includeUnreviewed?: string) {
    return this.incidentsService.findAll(includeUnreviewed === 'true');
  }

  @Get('map')
  async findForMap(
    @Query('north') north: string,
    @Query('south') south: string,
    @Query('east') east: string,
    @Query('west') west: string,
    @Query('anonId') anonId?: string,
    @CurrentUser('sub') citizenId?: number,
  ) {
    const filters: MapFilters = {
      north: Number(north),
      south: Number(south),
      east: Number(east),
      west: Number(west),
      anonId,
      citizenId,
    };

    return this.incidentsService.findForMap(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(Number(id));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Incident>) {
    return this.incidentsService.update(Number(id), body);
  }
}

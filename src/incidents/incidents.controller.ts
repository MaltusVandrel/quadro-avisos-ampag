import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IncidentsService, MapFilters, CreateIncidentInput, UpdateIncidentInput } from './incidents.service';
import { Incident } from './incident.entity';
import { Criticality } from '../common/lib/criticality';
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
    @Query('days') days: string,
    @Query('criticalities') criticalities: string | string[],
    @Query('pendingOnly') pendingOnly: string,
    @Query('mineOnly') mineOnly: string,
    @Query('anonId') anonId?: string,
    @CurrentUser('sub') citizenId?: number,
    @CurrentUser('role') role?: string,
  ) {
    const isAdmin = role === 'admin';

    const parsedCriticalities = (() => {
      if (!criticalities) return undefined;
      const items = Array.isArray(criticalities) ? criticalities : criticalities.split(',');
      return items
        .map((item) => item.trim())
        .filter((item) => Object.values(Criticality).includes(item as Criticality)) as Criticality[];
    })();

    const filters: MapFilters = {
      north: Number(north),
      south: Number(south),
      east: Number(east),
      west: Number(west),
      days: Number(days) || 15,
      anonId,
      citizenId,
      isAdmin,
      criticalities: parsedCriticalities,
      pendingOnly: pendingOnly === 'true',
      mineOnly: mineOnly === 'true',
    };

    return this.incidentsService.findForMap(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(Number(id));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateIncidentInput,
    @CurrentUser('sub') citizenId?: number,
    @CurrentUser('role') role?: string,
  ) {
    return this.incidentsService.update(Number(id), {
      ...body,
      citizenId,
      isAdmin: role === 'admin',
    });
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard)
  async approve(
    @Param('id') id: string,
    @CurrentUser('role') role?: string,
  ) {
    if (role !== 'admin') {
      throw new ForbiddenException('Apenas administradores podem aprovar ocorrências');
    }
    return this.incidentsService.approve(Number(id));
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @Body() body: { anonId?: string },
    @CurrentUser('sub') citizenId?: number,
    @CurrentUser('role') role?: string,
  ) {
    return this.incidentsService.deactivate(Number(id), {
      citizenId,
      anonId: body.anonId,
      isAdmin: role === 'admin',
    });
  }
}

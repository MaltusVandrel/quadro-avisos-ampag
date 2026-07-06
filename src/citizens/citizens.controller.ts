import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CitizensService } from './citizens.service';
import { Citizen } from './citizen.entity';

@Controller('citizens')
export class CitizensController {
  constructor(private readonly citizensService: CitizensService) {}

  @Post()
  create(@Body() body: Omit<Citizen, 'id' | 'createdAt'>) {
    return this.citizensService.create(body);
  }

  @Get()
  findAll() {
    return this.citizensService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.citizensService.findOne(id);
  }
}

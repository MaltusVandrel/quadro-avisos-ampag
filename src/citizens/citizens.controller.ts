import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CitizensService } from './citizens.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Citizen } from './citizen.entity';

function sanitizeCitizen(citizen: Citizen) {
  const sanitized = { ...(citizen as unknown as Record<string, unknown>) };
  delete sanitized.password;
  return sanitized;
}

@Controller('citizens')
export class CitizensController {
  constructor(private readonly citizensService: CitizensService) {}

  @Post()
  async create(@Body() body: Parameters<CitizensService['create']>[0]) {
    const citizen = await this.citizensService.create(body);
    return sanitizeCitizen(citizen);
  }

  @Get()
  async findAll() {
    const citizens = await this.citizensService.findAll();
    return citizens.map(sanitizeCitizen);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async findMe(@CurrentUser('sub') userId: number) {
    const citizen = await this.citizensService.findOne(userId);
    return sanitizeCitizen(citizen);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateMe(
    @CurrentUser('sub') userId: number,
    @Body() body: Parameters<CitizensService['update']>[1],
  ) {
    const citizen = await this.citizensService.update(userId, body);
    return sanitizeCitizen(citizen);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const citizen = await this.citizensService.findOne(Number(id));
    return sanitizeCitizen(citizen);
  }
}

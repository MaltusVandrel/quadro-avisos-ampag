import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CitizensService } from '../citizens/citizens.service';
import { encrypt } from '../common/lib/auth';
import { AuthGuard, AuthenticatedRequest } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

function sanitizeCitizen(citizen: { password: string }) {
  const sanitized = { ...(citizen as unknown as Record<string, unknown>) };
  delete sanitized.password;
  return sanitized;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly citizensService: CitizensService) {}

  @Post('login')
  async login(@Body() body: { cpf: string; password: string }) {
    if (!body.cpf || !body.password) {
      throw new UnauthorizedException('CPF e senha são obrigatórios');
    }

    const citizen = await this.citizensService.validatePassword(body.cpf, body.password);

    if (!citizen) {
      throw new UnauthorizedException('CPF ou senha inválidos');
    }

    const token = await encrypt({
      sub: citizen.id,
      login: citizen.cpf,
      role: citizen.role,
    });

    return {
      token,
      citizen: sanitizeCitizen(citizen),
    };
  }

  @Post('register')
  async register(
    @Body()
    body: {
      cpf: string;
      password: string;
      name: string;
      address?: string;
      birthAt?: string;
      email?: string;
      cellphone?: string;
      anonId?: string;
    },
  ) {
    const citizen = await this.citizensService.create({
      cpf: body.cpf,
      password: body.password,
      name: body.name,
      address: body.address,
      birthAt: body.birthAt,
      email: body.email,
      cellphone: body.cellphone,
      anonId: body.anonId,
    });

    const token = await encrypt({
      sub: citizen.id,
      login: citizen.cpf,
      role: citizen.role,
    });

    return {
      token,
      citizen: sanitizeCitizen(citizen),
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout() {
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser('sub') userId: number) {
    const citizen = await this.citizensService.findOne(userId);
    if (!citizen) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return sanitizeCitizen(citizen);
  }
}

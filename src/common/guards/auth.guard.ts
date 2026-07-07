import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { decrypt } from '../lib/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: number;
    login: string;
    role: string;
  };
}

const PUBLIC_PATHS = [
  /^\/$/,
  /^\/css\//,
  /^\/js\//,
  /^\/img\//,
  /^\/assets\//,
  /^\/favicon\.ico$/,
  /^\/manifest\.json$/,
  /^\/sw\.js$/,
  /^\/auth\/login$/,
  /^\/auth\/register$/,
  /^\/citizens$/,
  /^\/incidents$/,
  /^\/incidents\/map$/,
  /^\/incidents\/\d+\/deactivate$/,
];

function isPublicPath(req: AuthenticatedRequest): boolean {
  const path = req.originalUrl.split('?')[0];

  if (PUBLIC_PATHS.some((pattern) => pattern.test(path))) {
    return true;
  }

  // Allow anonymous uploads and public listing by incident.
  if (path === '/uploads' && (req.method === 'POST' || req.method === 'GET')) {
    return true;
  }

  return false;
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const isPublic = isPublicPath(req);

    const authHeader = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (token) {
      try {
        const payload = await decrypt(token);
        req.user = {
          sub: Number(payload.sub),
          login: String(payload.login),
          role: String(payload.role),
        };
      } catch {
        if (!isPublic) {
          throw new UnauthorizedException('Token inválido ou expirado');
        }
      }
    }

    if (!req.user && !isPublic) {
      throw new UnauthorizedException('Token não fornecido');
    }

    return true;
  }
}

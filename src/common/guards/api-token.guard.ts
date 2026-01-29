import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class SimpleTokenGuard implements CanActivate {
  private readonly VALID_TOKEN = process.env.JWT_SECRET;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
 
    if (!authHeader) {
      throw new UnauthorizedException('Token de API não fornecido');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    
    if (token !== this.VALID_TOKEN) {
      throw new UnauthorizedException('Token de API inválido');
    }

    return true;
  }
}
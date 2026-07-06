import { Injectable } from '@nestjs/common';
import { Citizen } from './citizen.entity';

@Injectable()
export class CitizensService {
  private citizens: Citizen[] = [];

  create(data: Omit<Citizen, 'id' | 'createdAt'>): Citizen {
    const citizen: Citizen = {
      id: `${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
    this.citizens.push(citizen);
    return citizen;
  }

  findAll(): Citizen[] {
    return this.citizens;
  }

  findOne(id: string): Citizen | undefined {
    return this.citizens.find((citizen) => citizen.id === id);
  }
}

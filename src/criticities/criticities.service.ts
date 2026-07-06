import { Injectable } from '@nestjs/common';
import { Criticality } from './criticality.entity';

@Injectable()
export class CriticalitiesService {
  private criticalities: Criticality[] = [
    {
      id: 'relato',
      name: 'Relato',
      color: 'gray',
      description: 'Depredação de ambiente público, área de risco, sem risco imediato',
    },
    {
      id: 'transtorno',
      name: 'Transtorno',
      color: 'yellow',
      description: 'Perturbação pública, incomodação geral e ativa da ordem',
    },
    {
      id: 'risco',
      name: 'Risco',
      color: 'orange',
      description: 'Risco à segurança ou sensação de perigo e movimentações suspeitas',
    },
    {
      id: 'perigo',
      name: 'Perigo',
      color: 'red',
      description: 'Risco imediato de crime, ações perigosas, porte de objeto perigoso, furtos',
    },
  ];

  findAll(): Criticality[] {
    return this.criticalities;
  }

  findOne(id: string): Criticality | undefined {
    return this.criticalities.find((item) => item.id === id);
  }
}

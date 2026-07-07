export enum Criticality {
  RELATO = 'Relato',
  TRANSTORNO = 'Transtorno',
  RISCO = 'Risco',
  PERIGO = 'Perigo',
}

export const CRITICALITY_COLORS: Record<Criticality, string> = {
  [Criticality.RELATO]: 'gray',
  [Criticality.TRANSTORNO]: 'yellow',
  [Criticality.RISCO]: 'orange',
  [Criticality.PERIGO]: 'red',
};

export const CRITICALITY_DESCRIPTIONS: Record<Criticality, string> = {
  [Criticality.RELATO]:
    'Depredação de ambiente público, área de risco, sem risco imediato',
  [Criticality.TRANSTORNO]:
    'Perturbação pública, incomodação geral e ativa da ordem',
  [Criticality.RISCO]:
    'Risco à segurança ou sensação de perigo e movimentações suspeitas',
  [Criticality.PERIGO]:
    'Risco imediato de crime, ações perigosas, porte de objeto perigoso, furtos',
};

export function isCriticality(value: string): value is Criticality {
  return Object.values(Criticality).includes(value as Criticality);
}

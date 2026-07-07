export class Citizen {
  id: number;
  cpf: string; // this is the login and unique
  password: string;
  name: string;
  address?: string;
  birthAt?: Date;
  email?: string;
  anonId?: string; // this is the anonId that will be used to link the anon use to citizen on the account creation
  cellphone?: string;
  role: string; // user || admin
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number; // Weak ref
  updatedBy?: number; // Weak ref
}

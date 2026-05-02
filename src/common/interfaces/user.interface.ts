import { User } from '@prisma/client';
import { IRepository } from './respository.interface';

export type CreateUserDTO = {
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  provider?: string;
  providerId?: string;
};

export type UpdateUserDTO = Partial<Omit<CreateUserDTO, 'email'>>;

export interface IUserRepository extends IRepository<User, CreateUserDTO, UpdateUserDTO> {
  findByEmail(email: string): Promise<User | null>;
}

export interface IUserService {
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(data: CreateUserDTO): Promise<User>;
  updateUser(id: string, data: UpdateUserDTO): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

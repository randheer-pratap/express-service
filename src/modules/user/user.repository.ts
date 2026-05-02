import { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import {
  IUserRepository,
  CreateUserDTO,
  UpdateUserDTO,
} from '../../common/interfaces/user.interface';
import { ILogger } from '../../common/interfaces/logger.interface';

/**
 * UserRepository: the only class in the system allowed to talk to the DB
 * for the User domain. Services never import PrismaClient directly.
 *
 * Notice the constructor: it receives ILogger (interface), not WinstonLogger
 * (concrete). The repository doesn't know or care which logger it gets.
 */
export class UserRepository implements IUserRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly logger: ILogger,
  ) {}

  async findById(id: string): Promise<User | null> {
    this.logger.debug('UserRepository.findById', { id });
    return this.db.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug('UserRepository.findByEmail', { email });
    return this.db.user.findUnique({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.db.user.findMany();
  }

  async create(data: CreateUserDTO): Promise<User> {
    this.logger.debug('UserRepository.create', { email: data.email });
    return this.db.user.create({ data });
  }

  async update(id: string, data: UpdateUserDTO): Promise<User> {
    this.logger.debug('UserRepository.update', { id });
    return this.db.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    this.logger.debug('UserRepository.delete', { id });
    await this.db.user.delete({ where: { id } });
  }
}

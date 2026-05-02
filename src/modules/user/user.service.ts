import { User } from '@prisma/client';
import {
  IUserRepository,
  IUserService,
  CreateUserDTO,
  UpdateUserDTO,
} from '../../common/interfaces/user.interface';
import { ILogger } from '../../common/interfaces/logger.interface';

/**
 * UserService: pure business logic. No DB calls here — ever.
 * It calls the repository through the IUserRepository interface.
 *
 * This is the Service → Repository → Infrastructure layering.
 * Each layer only knows about the layer directly below it,
 * and only through an interface.
 */
export class UserService implements IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: ILogger,
  ) {}

  async getUserById(id: string): Promise<User | null> {
    this.logger.info('UserService.getUserById', { id });
    return this.userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async createUser(data: CreateUserDTO): Promise<User> {
    this.logger.info('UserService.createUser', { email: data.email });

    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      // We'll replace this with a proper AppError in Phase 3
      throw new Error(`User with email ${data.email} already exists`);
    }

    return this.userRepository.create(data);
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<User> {
    this.logger.info('UserService.updateUser', { id });

    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new Error(`User with id ${id} not found`);
    }

    return this.userRepository.update(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.info('UserService.deleteUser', { id });
    await this.userRepository.delete(id);
  }
}

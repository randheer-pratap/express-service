import { UserService } from '../user.service';
import { IUserRepository, CreateUserDTO } from '../../../common/interfaces/user.interface';
import { ILogger } from '../../../common/interfaces/logger.interface';
import { User } from '@prisma/client';

// --- Mocks (no DB, no Winston, no network) ---

const mockUser: User = {
  id: 'test-uuid-123',
  email: 'test@example.com',
  passwordHash: null,
  firstName: 'Test',
  lastName: 'User',
  provider: 'local',
  providerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock repository — implements the interface, returns fake data
const mockUserRepository: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Mock logger — implements the interface, does nothing
const mockLogger: ILogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// --- Tests ---
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Inject mocks through the constructor — this is constructor injection
    service = new UserService(mockUserRepository, mockLogger);
  });

  describe('getUserById', () => {
    it('returns user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById('test-uuid-123');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-uuid-123');
    });

    it('returns null when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('throws when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const dto: CreateUserDTO = { email: 'test@example.com' };

      await expect(service.createUser(dto)).rejects.toThrow(
        'User with email test@example.com already exists',
      );

      // Critically: create() was never called — we stopped early
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('creates user when email is unique', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const dto: CreateUserDTO = { email: 'new@example.com' };
      const result = await service.createUser(dto);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith(dto);
    });
  });
});

/**
 * Generic base repository interface.
 * All repositories extend this — gives us a consistent API
 * across all data access objects and makes mocking trivial.
 */
export interface IRepository<T, CreateDTO, UpdateDTO> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T>;
  delete(id: string): Promise<void>;
}

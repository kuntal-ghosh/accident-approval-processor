import { dbManager } from '../database/connectionManager';

export class PrimaryRepository {
  private static instance: PrimaryRepository;

  private constructor() {}

  public static getInstance(): PrimaryRepository {
    if (!PrimaryRepository.instance) {
      PrimaryRepository.instance = new PrimaryRepository();
    }
    return PrimaryRepository.instance;
  }

  async findById(id: number): Promise<any> {
    const result = await dbManager.executeQuery(
      'primary',
      'SELECT * FROM sales.users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async create(data: any): Promise<any> {
    const { name, email } = data;
    const result = await dbManager.executeQuery(
      'primary',
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    return result.rows[0];
  }

  // Add other primary database operations as needed
}

export const primaryRepository = PrimaryRepository.getInstance();

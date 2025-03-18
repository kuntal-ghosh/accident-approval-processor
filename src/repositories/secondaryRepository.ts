import { dbManager } from '../database/connectionManager';

export class SecondaryRepository {
  private static instance: SecondaryRepository;

  private constructor() {}

  public static getInstance(): SecondaryRepository {
    if (!SecondaryRepository.instance) {
      SecondaryRepository.instance = new SecondaryRepository();
    }
    return SecondaryRepository.instance;
  }

  async findById(id: number): Promise<any> {
    const result = await dbManager.executeQuery(
      'secondary',
      'SELECT * FROM logs WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async createLog(data: any): Promise<any> {
    const { action, userId, details } = data;
    const result = await dbManager.executeQuery(
      'secondary',
      'INSERT INTO logs (action, user_id, details, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [action, userId, details]
    );
    return result.rows[0];
  }

  // Add other secondary database operations as needed
}

export const secondaryRepository = SecondaryRepository.getInstance();

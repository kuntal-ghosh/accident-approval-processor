import { dbManager } from '../database/connectionManager';
import { CriteriaVersion } from '../models/criteriaVersion.model';
import DatabaseSingleton from './db.singleton';

export class CriteriaVersionService {
  
  /**
   * Save new criteria with versioning
   * @param criteria The extracted criteria to save
   * @param description Optional description for this version
   * @returns The saved criteria version
   */
  async saveCriteriaVersion(criteria: any, description?: string): Promise<CriteriaVersion> {
    // const dbService = await DatabaseSingleton.getInstance();

    // Get the current latest version
    const latestVersion = await this.getLatestVersionNumber();
    const newVersion = latestVersion + 1;
    
    // Deactivate previous active version
    if (latestVersion > 0) {
      await dbManager.executeQuery(
        'primary',
        'UPDATE criteria.criteria_versions SET "isActive" = false WHERE "isActive" = true'
      );
    }
    
    // Insert the new version
    const result = await dbManager.executeQuery(
        'primary',
      `INSERT INTO criteria.criteria_versions 
        ("version", "criteria", "createdAt", "isActive", "description")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [newVersion, criteria, new Date(), true, description || null]
    );
    
    return result.rows[0] as CriteriaVersion;
  }
  
  /**
   * Get the latest version number from the database
   * @returns The latest version number, or 0 if no versions exist
   */
  async getLatestVersionNumber(): Promise<number> {
    // const dbService = await DatabaseSingleton.getInstance();
    // const result = await dbService.query(
    //   'SELECT MAX(version) as max_version FROM criteria.criteria_versions'
    // );
    const result= await dbManager.executeQuery(
        'primary',
        'SELECT MAX(version) as max_version FROM criteria.criteria_versions'
      );
    
    return result.rows[0]?.max_version || 0;
  }
  
  /**
   * Get the currently active version of the criteria
   * @returns The active criteria version, or null if none exists
   */
  async getActiveCriteria(): Promise<CriteriaVersion | null> {
    // const dbService = await DatabaseSingleton.getInstance();
    const result = await  dbManager.executeQuery(
        "primary",
      'SELECT * FROM criteria.criteria_versions WHERE "isActive" = true'
    );
    
    return result.rows.length > 0 ? result.rows[0] as CriteriaVersion : null;
  }
  
  /**
   * Get a specific version of the criteria
   * @param version The version number to retrieve
   * @returns The requested criteria version, or null if not found
   */
  async getCriteriaByVersion(version: number): Promise<CriteriaVersion | null> {
    const dbService = await DatabaseSingleton.getInstance();
    const result = await dbService.query(
      'SELECT * FROM criteria.criteria_versions WHERE version = $1',
      [version]
    );
    
    return result.rows.length > 0 ? result.rows[0] as CriteriaVersion : null;
  }
  
  /**
   * Get all versions of the criteria
   * @returns Array of all criteria versions
   */
  async getAllVersions(): Promise<CriteriaVersion[]> {
    const dbService = await DatabaseSingleton.getInstance();
    const result = await dbService.query(
      'SELECT * FROM criteria.criteria_versions ORDER BY version DESC'
    );
    
    return result.rows as CriteriaVersion[];
  }
  
  /**
   * Set a specific version as the active one
   * @param version The version number to set as active
   * @returns True if successful, false if version not found
   */
  async setActiveVersion(version: number): Promise<boolean> {
    const dbService = await DatabaseSingleton.getInstance();
    
    // Check if version exists
    const versionExists = await this.getCriteriaByVersion(version);
    if (!versionExists) return false;
    
    // Deactivate all versions
    await dbService.query(
      'UPDATE criteria.criteria_versions SET "isActive" = false'
    );
    
    // Activate the requested version
    await dbService.query(
      'UPDATE criteria.criteria_versions SET "isActive" = true WHERE version = $1',
      [version]
    );
    
    return true;
  }
}

export const criteriaVersionService = new CriteriaVersionService();

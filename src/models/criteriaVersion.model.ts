export interface CriteriaVersion {
  id?: number;
  version: number;
  criteria: any; // The extracted criteria JSON
  createdAt: Date;
  isActive: boolean;
  description?: string;
}

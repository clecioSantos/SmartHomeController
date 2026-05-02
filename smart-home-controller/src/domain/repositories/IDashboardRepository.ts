import { Device, Location } from '../entities/Device';
import { Layouts } from 'react-grid-layout';

export interface DashboardConfig {
  devices: Device[];
  layouts: Layouts;
  locations: Location[];
}

export interface IDashboardRepository {
  saveConfig(config: DashboardConfig): Promise<void>;
  loadConfig(): Promise<DashboardConfig | null>;
}
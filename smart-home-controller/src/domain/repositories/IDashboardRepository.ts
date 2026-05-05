import { Device, Location } from '../entities/Device';
import { Layout, LayoutItem } from 'react-grid-layout';
type Layouts = {
  [key: string]: LayoutItem[];
};
export interface DashboardConfig {
  devices: Device[];
  layouts: Layouts;
  locations: Location[];
}

export interface IDashboardRepository {
  saveConfig(config: DashboardConfig): Promise<void>;
  loadConfig(): Promise<DashboardConfig | null>;
}
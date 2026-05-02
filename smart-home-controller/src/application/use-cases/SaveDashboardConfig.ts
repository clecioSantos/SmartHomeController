import { IDashboardRepository, DashboardConfig } from '@domain/repositories/IDashboardRepository';

export class SaveDashboardConfigUseCase {
  constructor(private dashboardRepo: IDashboardRepository) {}

  async execute(config: DashboardConfig): Promise<void> {
    try {
      await this.dashboardRepo.saveConfig(config);
    } catch (error) {
      throw new Error(`Falha ao persistir configuração do Dashboard: ${error}`);
    }
  }
}
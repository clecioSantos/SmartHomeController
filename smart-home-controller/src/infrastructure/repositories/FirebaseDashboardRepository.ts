// Sobe 3 níveis: repositories -> infrastructure -> src -> root
import { db } from '@lib/firebase'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Sobe 2 níveis: repositories -> infrastructure -> src (então entra em domain)
import { IDashboardRepository, DashboardConfig } from '@domain/repositories/IDashboardRepository';

export class FirebaseDashboardRepository implements IDashboardRepository {
  private readonly docPath = doc(db, "smarthomeController", "dashboard_config");

  async saveConfig(config: DashboardConfig): Promise<void> {
    // Remove campos 'undefined' para compatibilidade com Firestore
    const payload = JSON.parse(JSON.stringify({
      ...config,
      updatedAt: Date.now()
    }));

    await setDoc(this.docPath, payload);
  }

  async loadConfig(): Promise<DashboardConfig | null> {
    const docSnap = await getDoc(this.docPath);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        devices: data.devices || [],
        layouts: data.layouts || {},
        locations: data.locations || []
      };
    }
    return null;
  }
}
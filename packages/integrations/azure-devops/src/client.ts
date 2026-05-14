import * as azdev from 'azure-devops-node-api';
import type { IWorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi.js';
import type { AzureDevOpsConfig } from './types.js';

export class AzureDevOpsClient {
  readonly config: AzureDevOpsConfig;
  private _witApi: IWorkItemTrackingApi | null = null;
  private _connection: azdev.WebApi;

  constructor(config: AzureDevOpsConfig) {
    this.config = config;
    const authHandler = azdev.getPersonalAccessTokenHandler(config.token);
    this._connection = new azdev.WebApi(config.orgUrl, authHandler);
  }

  async getWorkItemTrackingApi(): Promise<IWorkItemTrackingApi> {
    if (this._witApi === null) {
      this._witApi = await this._connection.getWorkItemTrackingApi();
    }
    return this._witApi;
  }
}

export abstract class HealthService {
  static getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date()
    };
  }
};
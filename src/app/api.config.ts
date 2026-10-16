import { InjectionToken } from '@angular/core';
import { environment } from '../environments/environment';

/** Override through DI when needed; null disables API requests until an address is configured. */
export const API_BASE_URL = new InjectionToken<string | null>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});

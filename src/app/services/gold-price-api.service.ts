import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { GoldPriceHistoryResponse, GoldPriceResponse, LatestGoldPricesResponse } from '../models/gold-price-api';

/** A typed configuration failure so the UI never has to inspect raw error text. */
export class ApiConfigurationError extends Error {
  constructor() { super('Gold-price API base URL is not configured.'); }
}

/** Typed HTTP transport; shared loading and validation belong to GoldPriceService. */
@Injectable({ providedIn: 'root' })
export class GoldPriceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL)?.trim().replace(/\/+$/, '');

  getLatest(): Observable<LatestGoldPricesResponse> {
    return this.get<LatestGoldPricesResponse>('/api/gold-prices');
  }

  /** Unsupported karats are validated by the API; its HTTP errors are passed through. */
  getLatestForKarat(karat: number): Observable<GoldPriceResponse> {
    return this.get<GoldPriceResponse>(`/api/gold-prices/${karat}`);
  }

  getHistory(): Observable<GoldPriceHistoryResponse> {
    return this.get<GoldPriceHistoryResponse>('/api/gold-prices/history');
  }

  private get<T>(path: string): Observable<T> {
    if (!this.baseUrl) {
      return throwError(() => new ApiConfigurationError());
    }
    return this.http.get<T>(`${this.baseUrl}${path}`);
  }
}

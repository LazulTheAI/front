import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

export interface RefreshRequest {
    token: string;
    refreshToken: string;
}

export interface AuthResponse {
    accessToken: string;
    tokenType: string;
    expiresInSeconds: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthApiService {
    private baseUrl = environment.baseUrl;

    constructor(private http: HttpClient) {}

    login(request: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.baseUrl}/api/mobile/auth/login`, request).pipe(
            tap((response) => {
                if (response.accessToken) {
                    // ← était response.token
                    localStorage.setItem('jwt', response.accessToken); // ← direct, pas de refreshToken
                }
            })
        );
    }
    decodeToken(): any | null {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payload = token.split('.')[1];
            return JSON.parse(atob(payload));
        } catch {
            return null;
        }
    }
    getCurrency(): string {
        return this.decodeToken()?.currency ?? 'EUR';
    }

    getDefaultLang(): string {
        return this.decodeToken()?.defaultLang ?? 'fr';
    }

    refresh(): Observable<AuthResponse> {
        const token = this.getToken();
        return this.http
            .post<AuthResponse>(
                `${this.baseUrl}/api/mobile/auth/refresh`, // ← URL corrigée
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            )
            .pipe(
                tap((response) => {
                    if (response.accessToken) {
                        // ← était response.token
                        localStorage.setItem('jwt', response.accessToken);
                    }
                })
            );
    }

    private saveTokens(token: string, refreshToken: string): void {
        localStorage.setItem('jwt', token);
        localStorage.setItem('refresh_token', refreshToken);
    }

    getToken(): string | null {
        return localStorage.getItem('jwt');
    }

    logout(): void {
        localStorage.removeItem('jwt');
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }
}

import { AuthCredentials, AuthResponse, Environment } from './types.js';

const AUTH_URLS = {
  production: 'https://pacer.login.uscourts.gov',
  qa: 'https://qa-login.uscourts.gov'
};

export class PacerAuth {
  private token: string | null = null;
  private clientCode: string | null = null;
  private environment: Environment;

  constructor(environment: Environment = 'production') {
    this.environment = environment;
  }

  /**
   * Authenticate with PACER and store the token
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResponse> {
    const authUrl = `${AUTH_URLS[this.environment]}/services/cso-auth`;

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const authResponse = await response.json() as AuthResponse;

    // Store the token if authentication was successful
    if (authResponse.nextGenCSO) {
      this.token = authResponse.nextGenCSO;
      if (credentials.clientCode) {
        this.clientCode = credentials.clientCode;
      }
    }

    return authResponse;
  }

  /**
   * Get the stored authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get the stored client code
   */
  getClientCode(): string | null {
    return this.clientCode;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Logout and clear stored token
   */
  async logout(): Promise<void> {
    if (!this.token) {
      return;
    }

    const logoutUrl = `${AUTH_URLS[this.environment]}/services/cso-logout`;

    try {
      await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          nextGenCSO: this.token
        })
      });
    } finally {
      this.token = null;
      this.clientCode = null;
    }
  }

  /**
   * Clear stored credentials without calling logout API
   */
  clearToken(): void {
    this.token = null;
    this.clientCode = null;
  }
}


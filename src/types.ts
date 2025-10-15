export type Environment = 'production' | 'qa';

export interface AuthCredentials {
  loginId: string;
  password: string;
  clientCode?: string;
  otpCode?: string;
  redactFlag?: '1';
}

export interface AuthResponse {
  nextGenCSO: string;
  loginResult: string;
  errorDescription: string;
}

export interface PacerClientOptions {
  environment?: Environment;
}


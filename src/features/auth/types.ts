export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface ForgotPasswordCredentials {
  email: string;
}

export interface ResetPasswordCredentials {
  password: string;
  confirmPassword: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export type UserRole = 'ADMIN' | 'APPRENANT' | 'admin' | 'apprenant' | 'student' | 'teacher';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string | null;
  bio?: string | null;
  preferences?: Record<string, unknown> | null;
  createdAt?: string;
  lastLoginAt?: string | null;
  mustChangePassword?: boolean;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  requestId?: string;
  errors?: Record<string, string[]>;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: ProblemDetails }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: ProblemDetails }>;
  setAccessToken: (token: string | null) => void;
  updateCurrentUser: (partialUser: Partial<AuthUser>) => void;
}


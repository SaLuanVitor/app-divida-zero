export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

export interface AuthResponse {
    user: User;
    access_token: string;
    refresh_token: string;
}


export interface User {
    id: string;
    name: string;
    email: string;
    role?: 'user' | 'admin';
    active?: boolean;
    force_password_change?: boolean;
    profile_icon_key?: string;
    profile_frame_key?: string;
}

export interface AuthResponse {
    user: User;
    access_token: string;
    refresh_token: string;
}


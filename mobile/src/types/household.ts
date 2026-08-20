export interface HouseholdMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface Household {
  id: number;
  name: string;
  invite_code: string;
  members: HouseholdMember[];
  owner_id: number;
}

export interface HouseholdInvitation {
  id: number;
  email: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by: string;
}

export interface PendingInvitation {
  id: number;
  token: string;
  household_name: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

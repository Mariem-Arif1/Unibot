export interface OrgAdmin {
  id: string;
  name: string;
  bc_company_name: string;
  bc_database_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrgCreatePayload {
  name: string;
  bc_company_name: string;
  bc_database_url?: string | null;
}

export interface OrgUpdatePayload {
  name?: string;
  bc_company_name?: string;
  bc_database_url?: string | null;
  is_active?: boolean;
}

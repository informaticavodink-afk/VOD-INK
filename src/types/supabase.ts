export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	public: {
		Tables: {
			studios: {
				Row: {
					id: string;
					slug: string;
					legal_name: string;
					trade_name: string;
					tax_id: string | null;
					address: string | null;
					city: string | null;
					postal_code: string | null;
					phone: string | null;
					health_registration_number: string | null;
					health_authorization_date: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					slug: string;
					legal_name: string;
					trade_name: string;
					tax_id?: string | null;
					address?: string | null;
					city?: string | null;
					postal_code?: string | null;
					phone?: string | null;
					health_registration_number?: string | null;
					health_authorization_date?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["studios"]["Insert"]>;
				Relationships: [];
			};
			profiles: {
				Row: {
					id: string;
					user_id: string;
					studio_id: string;
					role: Database["public"]["Enums"]["profile_role"];
					platform_role: Database["public"]["Enums"]["platform_role"];
					full_name: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					studio_id: string;
					role: Database["public"]["Enums"]["profile_role"];
					platform_role?: Database["public"]["Enums"]["platform_role"];
					full_name: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
				Relationships: [];
			};
			artists: {
				Row: {
					id: string;
					studio_id: string;
					profile_id: string | null;
					full_name: string;
					dni: string;
					qualification: string;
					login_email: string | null;
					photo_url: string | null;
					drive_folder_id: string | null;
					status: Database["public"]["Enums"]["artist_status"];
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					studio_id: string;
					profile_id?: string | null;
					full_name: string;
					dni: string;
					qualification: string;
					login_email?: string | null;
					photo_url?: string | null;
					drive_folder_id?: string | null;
					status?: Database["public"]["Enums"]["artist_status"];
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["artists"]["Insert"]>;
				Relationships: [];
			};
			consents: {
				Row: {
					id: string;
					studio_id: string;
					artist_id: string;
					client_full_name: string;
					client_dni: string;
					client_birth_date: string | null;
					client_phone: string | null;
					client_address: string | null;
					client_postal_code: string | null;
					client_city: string | null;
					is_minor: boolean;
					representative_full_name: string | null;
					representative_dni: string | null;
					representative_birth_date: string | null;
					representative_phone: string | null;
					representative_address: string | null;
					representative_postal_code: string | null;
					representative_city: string | null;
					representative_relationship: string | null;
					representative_accreditation: string | null;
					health_flags: Json;
					technique_data: Json;
					legal_acceptance: Json;
					signed_at: string | null;
					status: Database["public"]["Enums"]["consent_status"];
					idempotency_key: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					studio_id: string;
					artist_id: string;
					client_full_name: string;
					client_dni: string;
					client_birth_date?: string | null;
					client_phone?: string | null;
					client_address?: string | null;
					client_postal_code?: string | null;
					client_city?: string | null;
					is_minor?: boolean;
					representative_full_name?: string | null;
					representative_dni?: string | null;
					representative_birth_date?: string | null;
					representative_phone?: string | null;
					representative_address?: string | null;
					representative_postal_code?: string | null;
					representative_city?: string | null;
					representative_relationship?: string | null;
					representative_accreditation?: string | null;
					health_flags?: Json;
					technique_data?: Json;
					legal_acceptance?: Json;
					signed_at?: string | null;
					status?: Database["public"]["Enums"]["consent_status"];
					idempotency_key: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["consents"]["Insert"]>;
				Relationships: [];
			};
			consent_files: {
				Row: {
					id: string;
					consent_id: string;
					studio_id: string;
					artist_id: string;
					bucket_id: string;
					storage_path: string;
					file_name: string;
					mime_type: string;
					size_bytes: number | null;
					sha256: string | null;
					drive_file_id: string | null;
					drive_view_link: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					consent_id: string;
					studio_id: string;
					artist_id: string;
					bucket_id?: string;
					storage_path: string;
					file_name: string;
					mime_type?: string;
					size_bytes?: number | null;
					sha256?: string | null;
					drive_file_id?: string | null;
					drive_view_link?: string | null;
					created_at?: string;
				};
				Update: Partial<
					Database["public"]["Tables"]["consent_files"]["Insert"]
				>;
				Relationships: [];
			};
			notifications: {
				Row: {
					id: string;
					studio_id: string;
					artist_id: string | null;
					recipient_profile_id: string | null;
					consent_id: string | null;
					type: Database["public"]["Enums"]["notification_type"];
					title: string;
					body: string | null;
					status: Database["public"]["Enums"]["notification_status"];
					created_at: string;
					read_at: string | null;
					resolved_at: string | null;
				};
				Insert: {
					id?: string;
					studio_id: string;
					artist_id?: string | null;
					recipient_profile_id?: string | null;
					consent_id?: string | null;
					type: Database["public"]["Enums"]["notification_type"];
					title: string;
					body?: string | null;
					status?: Database["public"]["Enums"]["notification_status"];
					created_at?: string;
					read_at?: string | null;
					resolved_at?: string | null;
				};
				Update: Partial<
					Database["public"]["Tables"]["notifications"]["Insert"]
				>;
				Relationships: [];
			};
			audit_logs: {
				Row: {
					id: string;
					studio_id: string;
					actor_profile_id: string | null;
					artist_id: string | null;
					consent_id: string | null;
					action: string;
					metadata: Json;
					created_at: string;
				};
				Insert: {
					id?: string;
					studio_id: string;
					actor_profile_id?: string | null;
					artist_id?: string | null;
					consent_id?: string | null;
					action: string;
					metadata?: Json;
					created_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
				Relationships: [];
			};
			organizations: {
				Row: {
					id: string;
					slug: string;
					name: string;
					status: Database["public"]["Enums"]["organization_status"];
					legal_name: string | null;
					legal_identifier: string | null;
					billing_email: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					slug: string;
					name: string;
					status?: Database["public"]["Enums"]["organization_status"];
					legal_name?: string | null;
					legal_identifier?: string | null;
					billing_email?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<
					Database["public"]["Tables"]["organizations"]["Insert"]
				>;
				Relationships: [];
			};
			organization_memberships: {
				Row: {
					id: string;
					organization_id: string;
					user_id: string;
					role: Database["public"]["Enums"]["organization_role"];
					status: Database["public"]["Enums"]["membership_status"];
					joined_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					organization_id: string;
					user_id: string;
					role: Database["public"]["Enums"]["organization_role"];
					status?: Database["public"]["Enums"]["membership_status"];
					joined_at?: string;
					updated_at?: string;
				};
				Update: Partial<
					Database["public"]["Tables"]["organization_memberships"]["Insert"]
				>;
				Relationships: [
					{
						foreignKeyName: "organization_memberships_organization_id_fkey";
						columns: ["organization_id"];
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "organization_memberships_user_id_fkey";
						columns: ["user_id"];
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			organization_invitations: {
				Row: {
					id: string;
					organization_id: string;
					email: string;
					role: Database["public"]["Enums"]["organization_role"];
					invited_by: string;
					token_hash: string;
					expires_at: string;
					status: Database["public"]["Enums"]["invitation_status"];
					accepted_by: string | null;
					accepted_at: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					organization_id: string;
					email: string;
					role: Database["public"]["Enums"]["organization_role"];
					invited_by: string;
					token_hash: string;
					expires_at: string;
					status?: Database["public"]["Enums"]["invitation_status"];
					accepted_by?: string | null;
					accepted_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<
					Database["public"]["Tables"]["organization_invitations"]["Insert"]
				>;
				Relationships: [
					{
						foreignKeyName: "organization_invitations_organization_id_fkey";
						columns: ["organization_id"];
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "organization_invitations_invited_by_fkey";
						columns: ["invited_by"];
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "organization_invitations_accepted_by_fkey";
						columns: ["accepted_by"];
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			locations: {
				Row: {
					id: string;
					organization_id: string;
					name: string;
					address: string | null;
					phone: string | null;
					email: string | null;
					status: Database["public"]["Enums"]["organization_status"];
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					organization_id: string;
					name: string;
					address?: string | null;
					phone?: string | null;
					email?: string | null;
					status?: Database["public"]["Enums"]["organization_status"];
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["locations"]["Insert"]>;
				Relationships: [
					{
						foreignKeyName: "locations_organization_id_fkey";
						columns: ["organization_id"];
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			organization_branding: {
				Row: {
					id: string;
					organization_id: string;
					primary_color: string | null;
					secondary_color: string | null;
					logo_path: string | null;
					font_family: string | null;
					updated_at: string;
				};
				Insert: {
					id?: string;
					organization_id: string;
					primary_color?: string | null;
					secondary_color?: string | null;
					logo_path?: string | null;
					font_family?: string | null;
					updated_at?: string;
				};
				Update: Partial<
					Database["public"]["Tables"]["organization_branding"]["Insert"]
				>;
				Relationships: [
					{
						foreignKeyName: "organization_branding_organization_id_fkey";
						columns: ["organization_id"];
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			organization_settings: {
				Row: {
					id: string;
					organization_id: string;
					language: string;
					timezone: string;
					consent_redirect_seconds: number;
					notification_email: string | null;
					updated_at: string;
				};
				Insert: {
					id?: string;
					organization_id: string;
					language?: string;
					timezone?: string;
					consent_redirect_seconds?: number;
					notification_email?: string | null;
					updated_at?: string;
				};
				Update: Partial<
					Database["public"]["Tables"]["organization_settings"]["Insert"]
				>;
				Relationships: [
					{
						foreignKeyName: "organization_settings_organization_id_fkey";
						columns: ["organization_id"];
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: Record<string, never>;
		Functions: {
			get_active_artists: {
				Args: { studio_slug: string };
				Returns: Array<{
					id: string;
					studio_id: string;
					full_name: string;
					qualification: string;
					dni: string;
					photo_url: string | null;
					drive_folder_id: string | null;
				}>;
			};
		};
		Enums: {
			profile_role: "owner" | "artist";
			platform_role: "user" | "super_admin";
			organization_role: "owner" | "admin" | "artist";
			membership_status: "active" | "inactive";
			organization_status: "active" | "paused" | "suspended";
			invitation_status: "pending" | "accepted" | "revoked";
			artist_status: "active" | "paused";
			consent_status:
				| "draft"
				| "pending_technique"
				| "pending_artist"
				| "signed"
				| "upload_error"
				| "cancelled";
			notification_status: "unread" | "read" | "resolved";
			notification_type:
				| "pending_signature"
				| "pdf_upload_error"
				| "consent_signed"
				| "incomplete_data";
		};
		CompositeTypes: Record<string, never>;
	};
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      artists: {
        Row: {
          created_at: string
          dni: string
          drive_folder_id: string | null
          full_name: string
          id: string
          login_email: string | null
          photo_url: string | null
          profile_id: string | null
          qualification: string
          status: Database["public"]["Enums"]["artist_status"]
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dni: string
          drive_folder_id?: string | null
          full_name: string
          id?: string
          login_email?: string | null
          photo_url?: string | null
          profile_id?: string | null
          qualification: string
          status?: Database["public"]["Enums"]["artist_status"]
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dni?: string
          drive_folder_id?: string | null
          full_name?: string
          id?: string
          login_email?: string | null
          photo_url?: string | null
          profile_id?: string | null
          qualification?: string
          status?: Database["public"]["Enums"]["artist_status"]
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artists_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          artist_id: string | null
          consent_id: string | null
          created_at: string
          id: string
          metadata: Json
          studio_id: string
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          artist_id?: string | null
          consent_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          studio_id: string
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          artist_id?: string | null
          consent_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_files: {
        Row: {
          artist_id: string
          bucket_id: string
          consent_id: string
          created_at: string
          document_kind: string
          drive_copy_claimed_at: string | null
          drive_copy_completed_at: string | null
          drive_file_id: string | null
          drive_view_link: string | null
          file_name: string
          id: string
          mime_type: string
          sha256: string | null
          size_bytes: number | null
          storage_path: string
          studio_id: string
        }
        Insert: {
          artist_id: string
          bucket_id?: string
          consent_id: string
          created_at?: string
          document_kind?: string
          drive_copy_claimed_at?: string | null
          drive_copy_completed_at?: string | null
          drive_file_id?: string | null
          drive_view_link?: string | null
          file_name: string
          id?: string
          mime_type?: string
          sha256?: string | null
          size_bytes?: number | null
          storage_path: string
          studio_id: string
        }
        Update: {
          artist_id?: string
          bucket_id?: string
          consent_id?: string
          created_at?: string
          document_kind?: string
          drive_copy_claimed_at?: string | null
          drive_copy_completed_at?: string | null
          drive_file_id?: string | null
          drive_view_link?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          sha256?: string | null
          size_bytes?: number | null
          storage_path?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_files_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_files_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_files_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_signatures: {
        Row: {
          artist_id: string | null
          consent_id: string
          created_at: string
          id: string
          metadata: Json
          signature_hash: string
          signature_storage_path: string | null
          signed_at: string
          signer_name: string
          signer_type: string
          studio_id: string
        }
        Insert: {
          artist_id?: string | null
          consent_id: string
          created_at?: string
          id?: string
          metadata?: Json
          signature_hash: string
          signature_storage_path?: string | null
          signed_at?: string
          signer_name: string
          signer_type: string
          studio_id: string
        }
        Update: {
          artist_id?: string | null
          consent_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          signature_hash?: string
          signature_storage_path?: string | null
          signed_at?: string
          signer_name?: string
          signer_type?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_signatures_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_signatures_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_signatures_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          artist_id: string
          client_address: string | null
          client_birth_date: string | null
          client_city: string | null
          client_dni: string
          client_email: string | null
          client_full_name: string
          client_phone: string | null
          client_postal_code: string | null
          created_at: string
          document_snapshot: Json | null
          document_template_version: string | null
          final_file_id: string | null
          finalization_content_sha256: string | null
          finalization_started_at: string | null
          finalized_at: string | null
          has_legal_representative: boolean
          health_flags: Json
          id: string
          idempotency_key: string
          is_minor: boolean
          legal_acceptance: Json
          representative_accreditation: string | null
          representative_address: string | null
          representative_birth_date: string | null
          representative_city: string | null
          representative_dni: string | null
          representative_full_name: string | null
          representative_phone: string | null
          representative_postal_code: string | null
          representative_relationship: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
          studio_id: string
          technique_data: Json
          updated_at: string
        }
        Insert: {
          artist_id: string
          client_address?: string | null
          client_birth_date?: string | null
          client_city?: string | null
          client_dni: string
          client_email?: string | null
          client_full_name: string
          client_phone?: string | null
          client_postal_code?: string | null
          created_at?: string
          document_snapshot?: Json | null
          document_template_version?: string | null
          final_file_id?: string | null
          finalization_content_sha256?: string | null
          finalization_started_at?: string | null
          finalized_at?: string | null
          has_legal_representative: boolean
          health_flags?: Json
          id?: string
          idempotency_key: string
          is_minor?: boolean
          legal_acceptance?: Json
          representative_accreditation?: string | null
          representative_address?: string | null
          representative_birth_date?: string | null
          representative_city?: string | null
          representative_dni?: string | null
          representative_full_name?: string | null
          representative_phone?: string | null
          representative_postal_code?: string | null
          representative_relationship?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          studio_id: string
          technique_data?: Json
          updated_at?: string
        }
        Update: {
          artist_id?: string
          client_address?: string | null
          client_birth_date?: string | null
          client_city?: string | null
          client_dni?: string
          client_email?: string | null
          client_full_name?: string
          client_phone?: string | null
          client_postal_code?: string | null
          created_at?: string
          document_snapshot?: Json | null
          document_template_version?: string | null
          final_file_id?: string | null
          finalization_content_sha256?: string | null
          finalization_started_at?: string | null
          finalized_at?: string | null
          has_legal_representative?: boolean
          health_flags?: Json
          id?: string
          idempotency_key?: string
          is_minor?: boolean
          legal_acceptance?: Json
          representative_accreditation?: string | null
          representative_address?: string | null
          representative_birth_date?: string | null
          representative_city?: string | null
          representative_dni?: string | null
          representative_full_name?: string | null
          representative_phone?: string | null
          representative_postal_code?: string | null
          representative_relationship?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          studio_id?: string
          technique_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_artist_studio_fkey"
            columns: ["artist_id", "studio_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id", "studio_id"]
          },
          {
            foreignKeyName: "consents_final_file_id_fkey"
            columns: ["final_file_id"]
            isOneToOne: false
            referencedRelation: "consent_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          artist_id: string | null
          body: string | null
          consent_id: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_profile_id: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          studio_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          artist_id?: string | null
          body?: string | null
          consent_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_profile_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          studio_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          artist_id?: string | null
          body?: string | null
          consent_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_profile_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          studio_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["profile_role"]
          studio_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          health_authorization_date: string | null
          health_data_verified_at: string | null
          health_registration_number: string | null
          id: string
          legal_name: string
          phone: string | null
          postal_code: string | null
          slug: string
          tax_id: string | null
          trade_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          health_authorization_date?: string | null
          health_data_verified_at?: string | null
          health_registration_number?: string | null
          id?: string
          legal_name: string
          phone?: string | null
          postal_code?: string | null
          slug: string
          tax_id?: string | null
          trade_name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          health_authorization_date?: string | null
          health_data_verified_at?: string | null
          health_registration_number?: string | null
          id?: string
          legal_name?: string
          phone?: string | null
          postal_code?: string | null
          slug?: string
          tax_id?: string | null
          trade_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_studio_settings_as_manager: {
        Args: {
          p_actor_profile_id: string
          p_address: string
          p_attest_health_data?: boolean
          p_city: string
          p_health_authorization_date: string | null
          p_health_registration_number: string | null
          p_legal_name: string
          p_phone: string
          p_postal_code: string
          p_studio_id: string
          p_tax_id: string
          p_trade_name: string
        }
        Returns: Database["public"]["Tables"]["studios"]["Row"]
      }
    }
    Enums: {
      artist_status: "active" | "paused"
      consent_status:
        | "draft"
        | "pending_technique"
        | "pending_artist"
        | "signed"
        | "upload_error"
        | "cancelled"
      notification_status: "unread" | "read" | "resolved"
      notification_type:
        | "pending_signature"
        | "pdf_upload_error"
        | "consent_signed"
        | "incomplete_data"
      profile_role: "owner" | "artist" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      artist_status: ["active", "paused"],
      consent_status: [
        "draft",
        "pending_technique",
        "pending_artist",
        "signed",
        "upload_error",
        "cancelled",
      ],
      notification_status: ["unread", "read", "resolved"],
      notification_type: [
        "pending_signature",
        "pdf_upload_error",
        "consent_signed",
        "incomplete_data",
      ],
      profile_role: ["owner", "artist", "admin"],
    },
  },
} as const

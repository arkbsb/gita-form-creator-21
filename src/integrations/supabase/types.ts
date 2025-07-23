export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      "(TABELA_MODELO_LEADS)": {
        Row: {
          id: number
          name: string | null
          remotejid: string | null
          response_id: string | null
          timestamp: string | null
          tokens: number | null
        }
        Insert: {
          id?: number
          name?: string | null
          remotejid?: string | null
          response_id?: string | null
          timestamp?: string | null
          tokens?: number | null
        }
        Update: {
          id?: number
          name?: string | null
          remotejid?: string | null
          response_id?: string | null
          timestamp?: string | null
          tokens?: number | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          amount_spent: number
          classification: string
          content_id: string | null
          cost_per_engagement: number
          created_at: string
          end_date: string
          engagement: number
          frequency: number
          id: string
          name: string
          play_100_percent: number
          play_25_percent: number
          play_50_percent: number
          play_75_percent: number
          play_95_percent: number
          project_id: number
          reach: number
          start_date: string
          thruplay: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_spent?: number
          classification: string
          content_id?: string | null
          cost_per_engagement?: number
          created_at?: string
          end_date: string
          engagement?: number
          frequency?: number
          id?: string
          name: string
          play_100_percent?: number
          play_25_percent?: number
          play_50_percent?: number
          play_75_percent?: number
          play_95_percent?: number
          project_id: number
          reach?: number
          start_date: string
          thruplay?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_spent?: number
          classification?: string
          content_id?: string | null
          cost_per_engagement?: number
          created_at?: string
          end_date?: string
          engagement?: number
          frequency?: number
          id?: string
          name?: string
          play_100_percent?: number
          play_25_percent?: number
          play_50_percent?: number
          play_75_percent?: number
          play_95_percent?: number
          project_id?: number
          reach?: number
          start_date?: string
          thruplay?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          amount_spent: number
          classification: string
          content_id: string
          cost_per_follower: number | null
          cpm: number
          created_at: string
          end_date: string
          engagement: number
          followers_after: number
          followers_before: number
          id: string
          name: string
          project_id: number
          reach: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_spent?: number
          classification: string
          content_id: string
          cost_per_follower?: number | null
          cpm?: number
          created_at?: string
          end_date: string
          engagement?: number
          followers_after?: number
          followers_before?: number
          id?: string
          name: string
          project_id: number
          reach?: number
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_spent?: number
          classification?: string
          content_id?: string
          cost_per_follower?: number | null
          cpm?: number
          created_at?: string
          end_date?: string
          engagement?: number
          followers_after?: number
          followers_before?: number
          id?: string
          name?: string
          project_id?: number
          reach?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_responses: {
        Row: {
          created_at: string
          field_id: string
          file_url: string | null
          id: string
          submission_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          field_id: string
          file_url?: string | null
          id?: string
          submission_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          field_id?: string
          file_url?: string | null
          id?: string
          submission_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_field_responses_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          description: string | null
          form_id: string
          id: string
          is_required: boolean
          label: string
          options: Json | null
          order_index: number
          placeholder: string | null
          type: string
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_id: string
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
          order_index: number
          placeholder?: string | null
          type: string
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          form_id?: string
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
          order_index?: number
          placeholder?: string | null
          type?: string
          updated_at?: string
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          form_id: string
          id: string
          ip_address: unknown | null
          submission_data: Json
          submitted_at: string
          submitted_by_email: string | null
          submitted_by_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          form_id: string
          id?: string
          ip_address?: unknown | null
          submission_data: Json
          submitted_at?: string
          submitted_by_email?: string | null
          submitted_by_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          form_id?: string
          id?: string
          ip_address?: unknown | null
          submission_data?: Json
          submitted_at?: string
          submitted_by_email?: string | null
          submitted_by_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          allow_multiple_submissions: boolean
          background_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          require_login: boolean
          show_progress_bar: boolean
          slug: string
          submit_button_text: string | null
          success_message: string | null
          theme_color: string | null
          title: string
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          allow_multiple_submissions?: boolean
          background_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          require_login?: boolean
          show_progress_bar?: boolean
          slug: string
          submit_button_text?: string | null
          success_message?: string | null
          theme_color?: string | null
          title: string
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          allow_multiple_submissions?: boolean
          background_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          require_login?: boolean
          show_progress_bar?: boolean
          slug?: string
          submit_button_text?: string | null
          success_message?: string | null
          theme_color?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          current_spend: number
          description: string | null
          id: number
          monthly_budget: number
          name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_spend?: number
          description?: string | null
          id?: number
          monthly_budget: number
          name: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_spend?: number
          description?: string | null
          id?: number
          monthly_budget?: number
          name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

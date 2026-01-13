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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          related_image_id: string | null
          resolution_used: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          related_image_id?: string | null
          resolution_used?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          related_image_id?: string | null
          resolution_used?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_related_image_id_fkey"
            columns: ["related_image_id"]
            isOneToOne: false
            referencedRelation: "generated_images"
            referencedColumns: ["id"]
          },
        ]
      }
      design_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          aspect_ratio: string
          color_palette: string[] | null
          content_image_url: string | null
          created_at: string
          domain: string | null
          id: string
          image_url: string
          is_free_plan: boolean | null
          is_showcase: boolean | null
          logo_positions: string[] | null
          logo_urls: string[] | null
          prompt: string
          reference_image_url: string | null
          resolution: string
          user_id: string | null
        }
        Insert: {
          aspect_ratio: string
          color_palette?: string[] | null
          content_image_url?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          image_url: string
          is_free_plan?: boolean | null
          is_showcase?: boolean | null
          logo_positions?: string[] | null
          logo_urls?: string[] | null
          prompt: string
          reference_image_url?: string | null
          resolution: string
          user_id?: string | null
        }
        Update: {
          aspect_ratio?: string
          color_palette?: string[] | null
          content_image_url?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          image_url?: string
          is_free_plan?: boolean | null
          is_showcase?: boolean | null
          logo_positions?: string[] | null
          logo_urls?: string[] | null
          prompt?: string
          reference_image_url?: string | null
          resolution?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partner_designers: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_verified: boolean | null
          portfolio_url: string | null
          templates_count: number | null
          total_earnings: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_verified?: boolean | null
          portfolio_url?: string | null
          templates_count?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_verified?: boolean | null
          portfolio_url?: string | null
          templates_count?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_fcfa: number
          amount_usd: number
          created_at: string
          id: string
          metadata: Json | null
          moneroo_payment_id: string | null
          payment_method: string | null
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_fcfa: number
          amount_usd: number
          created_at?: string
          id?: string
          metadata?: Json | null
          moneroo_payment_id?: string | null
          payment_method?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_fcfa?: number
          amount_usd?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          moneroo_payment_id?: string | null
          payment_method?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          cover_image_url: string | null
          created_at: string
          default_color_palette: string[] | null
          default_logo_url: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_color_palette?: string[] | null
          default_logo_url?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_color_palette?: string[] | null
          default_logo_url?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      reference_templates: {
        Row: {
          created_at: string
          description: string | null
          design_category: string
          designer_id: string | null
          domain: string
          earnings: number | null
          id: string
          image_url: string
          is_active: boolean | null
          tags: string[] | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          design_category: string
          designer_id?: string | null
          domain: string
          earnings?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          tags?: string[] | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          design_category?: string
          designer_id?: string | null
          domain?: string
          earnings?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          tags?: string[] | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_templates_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "partner_designers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          credits_per_month: number
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_popular: boolean
          max_resolution: string
          name: string
          price_fcfa: number
          price_usd: number
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          credits_per_month?: number
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          max_resolution?: string
          name: string
          price_fcfa?: number
          price_usd?: number
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          credits_per_month?: number
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          max_resolution?: string
          name?: string
          price_fcfa?: number
          price_usd?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      template_earnings: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          template_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          template_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_earnings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "reference_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          credits_remaining: number
          current_period_end: string
          current_period_start: string
          free_generations_used: number
          id: string
          moneroo_subscription_id: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          current_period_end?: string
          current_period_start?: string
          free_generations_used?: number
          id?: string
          moneroo_subscription_id?: string | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          current_period_end?: string
          current_period_start?: string
          free_generations_used?: number
          id?: string
          moneroo_subscription_id?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_subscription: {
        Args: {
          p_admin_id: string
          p_credits?: number
          p_duration_months?: number
          p_plan_slug: string
          p_target_user_id: string
        }
        Returns: Json
      }
      check_and_debit_credits: {
        Args: { p_image_id?: string; p_resolution: string; p_user_id: string }
        Returns: Json
      }
      get_or_create_user_subscription: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          credits_remaining: number
          current_period_end: string
          current_period_start: string
          free_generations_used: number
          id: string
          moneroo_subscription_id: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_role_level: { Args: { _user_id: string }; Returns: number }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "content_manager"
        | "designer"
        | "user"
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
      app_role: ["super_admin", "admin", "content_manager", "designer", "user"],
    },
  },
} as const

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
      affiliate_payout_requests: {
        Row: {
          admin_note: string | null
          affiliate_id: string
          amount_fcfa: number | null
          amount_usd: number
          id: string
          payment_details: Json
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          affiliate_id: string
          amount_fcfa?: number | null
          amount_usd: number
          id?: string
          payment_details?: Json
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          affiliate_id?: string
          amount_fcfa?: number | null
          amount_usd?: number
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payout_requests_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          referral_code: string
          total_earnings: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          referral_code: string
          total_earnings?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          referral_code?: string
          total_earnings?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_idempotency_keys: {
        Row: {
          api_key_id: string
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          response_body: Json
          status_code: number
        }
        Insert: {
          api_key_id: string
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          response_body: Json
          status_code: number
        }
        Update: {
          api_key_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          response_body?: Json
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_idempotency_keys_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          environment: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          credits_used: number
          duration_ms: number | null
          endpoint: string
          error_code: string | null
          id: string
          ip: string | null
          method: string
          mode: string | null
          request_id: string | null
          status_code: number
          template_used_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          credits_used?: number
          duration_ms?: number | null
          endpoint: string
          error_code?: string | null
          id?: string
          ip?: string | null
          method?: string
          mode?: string | null
          request_id?: string | null
          status_code: number
          template_used_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          credits_used?: number
          duration_ms?: number | null
          endpoint?: string
          error_code?: string | null
          id?: string
          ip?: string | null
          method?: string
          mode?: string | null
          request_id?: string | null
          status_code?: number
          template_used_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "credit_transactions_related_image_id_fkey"
            columns: ["related_image_id"]
            isOneToOne: false
            referencedRelation: "public_showcase_images"
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
      designer_payout_requests: {
        Row: {
          admin_note: string | null
          amount_fcfa: number
          amount_usd: number
          designer_id: string
          id: string
          payment_details: Json
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          amount_fcfa: number
          amount_usd: number
          designer_id: string
          id?: string
          payment_details?: Json
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          amount_fcfa?: number
          amount_usd?: number
          designer_id?: string
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "designer_payout_requests_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "partner_designers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designer_payout_requests_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "partner_designers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          is_downloaded: boolean | null
          is_free_plan: boolean | null
          is_showcase: boolean | null
          logo_positions: string[] | null
          logo_urls: string[] | null
          prompt: string
          reference_image_url: string | null
          resolution: string
          showcase_order: number | null
          user_id: string | null
          user_rating: number | null
        }
        Insert: {
          aspect_ratio: string
          color_palette?: string[] | null
          content_image_url?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          image_url: string
          is_downloaded?: boolean | null
          is_free_plan?: boolean | null
          is_showcase?: boolean | null
          logo_positions?: string[] | null
          logo_urls?: string[] | null
          prompt: string
          reference_image_url?: string | null
          resolution: string
          showcase_order?: number | null
          user_id?: string | null
          user_rating?: number | null
        }
        Update: {
          aspect_ratio?: string
          color_palette?: string[] | null
          content_image_url?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          image_url?: string
          is_downloaded?: boolean | null
          is_free_plan?: boolean | null
          is_showcase?: boolean | null
          logo_positions?: string[] | null
          logo_urls?: string[] | null
          prompt?: string
          reference_image_url?: string | null
          resolution?: string
          showcase_order?: number | null
          user_id?: string | null
          user_rating?: number | null
        }
        Relationships: []
      }
      generation_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          image_id: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          image_id?: string | null
          rating: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          image_id?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_feedback_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "generated_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_feedback_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "public_showcase_images"
            referencedColumns: ["id"]
          },
        ]
      }
      image_jobs: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          fallback_used: boolean
          id: string
          model_used: string | null
          params: Json | null
          provider_used: string | null
          result_url: string | null
          status: string
          task_id: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          fallback_used?: boolean
          id?: string
          model_used?: string | null
          params?: Json | null
          provider_used?: string | null
          result_url?: string | null
          status?: string
          task_id?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          fallback_used?: boolean
          id?: string
          model_used?: string | null
          params?: Json | null
          provider_used?: string | null
          result_url?: string | null
          status?: string
          task_id?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "reference_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "reference_templates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marquee_items: {
        Row: {
          created_at: string
          domain: string
          id: string
          image_url: string
          is_active: boolean
          item_type: string
          row_number: number
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string
          id?: string
          image_url: string
          is_active?: boolean
          item_type: string
          row_number?: number
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          image_url?: string
          is_active?: boolean
          item_type?: string
          row_number?: number
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          payload: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          payload?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          payload?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
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
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      pricing_offers: {
        Row: {
          code: string
          created_at: string
          discount_pct: number
          expires_at: string
          id: string
          reason: string | null
          used_at: string | null
          used_transaction_id: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_pct: number
          expires_at: string
          id?: string
          reason?: string | null
          used_at?: string | null
          used_transaction_id?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_pct?: number
          expires_at?: string
          id?: string
          reason?: string | null
          used_at?: string | null
          used_transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          default_color_palette: string[] | null
          default_logo_url: string | null
          email: string | null
          expectations: string | null
          full_name: string | null
          how_heard_about_us: string | null
          id: string
          industry: string | null
          onboarding_completed: boolean | null
          phone: string | null
          referred_by: string | null
          tutorial_completed: boolean | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_color_palette?: string[] | null
          default_logo_url?: string | null
          email?: string | null
          expectations?: string | null
          full_name?: string | null
          how_heard_about_us?: string | null
          id?: string
          industry?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          referred_by?: string | null
          tutorial_completed?: boolean | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_color_palette?: string[] | null
          default_logo_url?: string | null
          email?: string | null
          expectations?: string | null
          full_name?: string | null
          how_heard_about_us?: string | null
          id?: string
          industry?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          referred_by?: string | null
          tutorial_completed?: boolean | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      promo_code_redemptions: {
        Row: {
          created_at: string
          currency: string | null
          discount_amount: number | null
          final_amount: number | null
          id: string
          original_amount: number | null
          payment_transaction_id: string | null
          plan_slug: string | null
          promo_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          final_amount?: number | null
          id?: string
          original_amount?: number | null
          payment_transaction_id?: string | null
          plan_slug?: string | null
          promo_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          final_amount?: number | null
          id?: string
          original_amount?: number | null
          payment_transaction_id?: string | null
          plan_slug?: string | null
          promo_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_percent: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          once_per_user: boolean
          updated_at: string
          uses_count: number
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          once_per_user?: boolean
          updated_at?: string
          uses_count?: number
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          once_per_user?: boolean
          updated_at?: string
          uses_count?: number
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
          {
            foreignKeyName: "reference_templates_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "partner_designers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          commission_rate: number
          created_at: string
          id: string
          payment_transaction_id: string | null
          referred_user_id: string
          status: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          payment_transaction_id?: string | null
          referred_user_id: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          payment_transaction_id?: string | null
          referred_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
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
      service_health: {
        Row: {
          id: string
          message: string | null
          service: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          message?: string | null
          service: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message?: string | null
          service?: string
          status?: string
          updated_at?: string
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
      subscription_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          full_name: string
          id: string
          phone: string
          plan_slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone: string
          plan_slug: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          plan_slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          invited_at: string
          invited_email: string | null
          joined_at: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          invited_at?: string
          invited_email?: string | null
          joined_at?: string | null
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          invited_at?: string
          invited_email?: string | null
          joined_at?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          credits_pool: number
          id: string
          max_members: number
          name: string
          owner_id: string
          plan_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_pool?: number
          id?: string
          max_members?: number
          name: string
          owner_id: string
          plan_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_pool?: number
          id?: string
          max_members?: number
          name?: string
          owner_id?: string
          plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      template_earnings: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          designer_id: string | null
          id: string
          job_id: string | null
          royalty_rate: number | null
          template_id: string
          unit_value_usd: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          designer_id?: string | null
          id?: string
          job_id?: string | null
          royalty_rate?: number | null
          template_id: string
          unit_value_usd?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          designer_id?: string | null
          id?: string
          job_id?: string | null
          royalty_rate?: number | null
          template_id?: string
          unit_value_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_earnings_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "partner_designers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_earnings_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "partner_designers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_earnings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "reference_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_earnings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "reference_templates_public"
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
      partner_designers_public: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_verified: boolean | null
          portfolio_url: string | null
          templates_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          portfolio_url?: string | null
          templates_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          portfolio_url?: string | null
          templates_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_showcase_images: {
        Row: {
          aspect_ratio: string | null
          created_at: string | null
          domain: string | null
          id: string | null
          image_url: string | null
          resolution: string | null
          showcase_order: number | null
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string | null
          image_url?: string | null
          resolution?: string | null
          showcase_order?: number | null
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string | null
          image_url?: string | null
          resolution?: string | null
          showcase_order?: number | null
        }
        Relationships: []
      }
      reference_templates_public: {
        Row: {
          created_at: string | null
          description: string | null
          design_category: string | null
          designer_id: string | null
          domain: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          tags: string[] | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          design_category?: string | null
          designer_id?: string | null
          domain?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          tags?: string[] | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          design_category?: string | null
          designer_id?: string | null
          domain?: string | null
          id?: string | null
          image_url?: string | null
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
          {
            foreignKeyName: "reference_templates_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "partner_designers_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_get_financial_stats: { Args: { p_admin_id: string }; Returns: Json }
      admin_get_payment_transactions: {
        Args: { p_admin_id: string }
        Returns: {
          amount_fcfa: number
          amount_usd: number
          created_at: string
          id: string
          payment_method: string
          plan_name: string
          status: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_get_users_with_subscriptions: {
        Args: { p_admin_id: string }
        Returns: {
          company_name: string
          created_at: string
          credits_remaining: number
          current_period_end: string
          email: string
          free_generations_used: number
          full_name: string
          plan_name: string
          plan_slug: string
          sub_status: string
          user_id: string
        }[]
      }
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
      admin_list_affiliate_payouts: {
        Args: { p_admin_id: string }
        Returns: {
          admin_note: string
          affiliate_email: string
          affiliate_id: string
          affiliate_name: string
          amount_fcfa: number
          amount_usd: number
          id: string
          payment_details: Json
          payment_method: string
          processed_at: string
          requested_at: string
          status: string
        }[]
      }
      admin_list_designer_payouts: {
        Args: { p_admin_id: string }
        Returns: {
          admin_note: string
          amount_fcfa: number
          amount_usd: number
          designer_id: string
          designer_name: string
          id: string
          payment_details: Json
          payment_method: string
          processed_at: string
          requested_at: string
          status: string
        }[]
      }
      admin_list_promo_redemptions: {
        Args: { p_admin_id: string }
        Returns: {
          code: string
          created_at: string
          currency: string
          discount_amount: number
          final_amount: number
          id: string
          original_amount: number
          plan_slug: string
          promo_code_id: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_set_platform_setting: {
        Args: { p_admin_id: string; p_key: string; p_value: Json }
        Returns: undefined
      }
      check_and_debit_credits:
        | {
            Args: {
              p_image_id?: string
              p_resolution: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_image_id?: string
              p_is_modification?: boolean
              p_resolution: string
              p_user_id: string
            }
            Returns: Json
          }
      create_notification: {
        Args: {
          p_body?: string
          p_link?: string
          p_payload?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      get_affiliate_balance: { Args: { p_affiliate_id: string }; Returns: Json }
      get_affiliate_referrals: {
        Args: { p_affiliate_id: string }
        Returns: {
          joined_at: string
          plan_name: string
          referral_name: string
          status: string
          total_earned: number
        }[]
      }
      get_designer_balance: { Args: { p_designer_id: string }; Returns: Json }
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
      match_reference_template: {
        Args: { p_domain: string; p_subject: string }
        Returns: {
          design_category: string
          domain: string
          id: string
          image_url: string
          score: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_promo_code: {
        Args: {
          p_code: string
          p_currency?: string
          p_original_amount: number
          p_payment_transaction_id?: string
          p_plan_slug: string
        }
        Returns: Json
      }
      submit_generation_feedback: {
        Args: {
          p_comment: string
          p_image_id: string
          p_rating: number
          p_user_id: string
        }
        Returns: undefined
      }
      validate_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          api_key_id: string
          environment: string
          scopes: string[]
          user_id: string
        }[]
      }
      validate_promo_code: {
        Args: { p_code: string; p_plan_slug?: string }
        Returns: Json
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

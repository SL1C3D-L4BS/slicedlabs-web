// GENERATED from the live Supabase project (zaskrhtcadamiutdecgu) — do not edit by hand.
// Regenerate after migrations via the Supabase MCP `generate_typescript_types`.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      entitlements: {
        Row: {
          expires_at: string | null
          granted_at: string
          id: string
          kind: string
          ref_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          kind: string
          ref_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          kind?: string
          ref_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          hubspot_id: string | null
          id: string
          payload: Json
          score: number
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          hubspot_id?: string | null
          id?: string
          payload?: Json
          score?: number
          source: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          hubspot_id?: string | null
          id?: string
          payload?: Json
          score?: number
          source?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          beehiiv_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          hubspot_id: string | null
          id: string
          lead_score: number
          shopify_customer_id: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          beehiiv_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          hubspot_id?: string | null
          id: string
          lead_score?: number
          shopify_customer_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          beehiiv_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          hubspot_id?: string | null
          id?: string
          lead_score?: number
          shopify_customer_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_recipes: {
        Row: {
          id: string
          note: string | null
          recipe_slug: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          note?: string | null
          recipe_slug: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          note?: string | null
          recipe_slug?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]

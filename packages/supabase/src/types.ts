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
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      drops: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          product_ids: string[]
          slug: string
          starts_at: string | null
          status: string
          title: string
          type: Database["public"]["Enums"]["fulfillment_type"]
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          product_ids?: string[]
          slug: string
          starts_at?: string | null
          status?: string
          title: string
          type?: Database["public"]["Enums"]["fulfillment_type"]
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          product_ids?: string[]
          slug?: string
          starts_at?: string | null
          status?: string
          title?: string
          type?: Database["public"]["Enums"]["fulfillment_type"]
        }
        Relationships: []
      }
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
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          printful_variant_id: string | null
          qty: number
          sku: string | null
          title: string
          unit_price_cents: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          printful_variant_id?: string | null
          qty: number
          sku?: string | null
          title: string
          unit_price_cents: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          printful_variant_id?: string | null
          qty?: number
          sku?: string | null
          title?: string
          unit_price_cents?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          email: string
          fulfillment_type:
            | Database["public"]["Enums"]["fulfillment_type"]
            | null
          id: string
          printful_order_id: string | null
          shipping_address: Json | null
          shipping_cents: number
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          tracking: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          email: string
          fulfillment_type?:
            | Database["public"]["Enums"]["fulfillment_type"]
            | null
          id?: string
          printful_order_id?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          tracking?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          email?: string
          fulfillment_type?:
            | Database["public"]["Enums"]["fulfillment_type"]
            | null
          id?: string
          printful_order_id?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          tracking?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          images: Json
          metadata: Json
          printful_product_id: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          images?: Json
          metadata?: Json
          printful_product_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          images?: Json
          metadata?: Json
          printful_product_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          title?: string
          updated_at?: string
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
      variants: {
        Row: {
          created_at: string
          currency: string
          id: string
          inventory_qty: number | null
          options: Json
          position: number
          price_cents: number
          printful_variant_id: string | null
          product_id: string
          sku: string | null
          stripe_price_id: string | null
          title: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          inventory_qty?: number | null
          options?: Json
          position?: number
          price_cents: number
          printful_variant_id?: string | null
          product_id: string
          sku?: string | null
          stripe_price_id?: string | null
          title?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          inventory_qty?: number | null
          options?: Json
          position?: number
          price_cents?: number
          printful_variant_id?: string | null
          product_id?: string
          sku?: string | null
          stripe_price_id?: string | null
          title?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      fulfillment_type: "pod" | "in_house" | "digital"
      order_status:
        | "pending"
        | "paid"
        | "fulfilling"
        | "shipped"
        | "delivered"
        | "refunded"
        | "canceled"
      product_status: "draft" | "active" | "archived"
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
      fulfillment_type: ["pod", "in_house", "digital"],
      order_status: [
        "pending",
        "paid",
        "fulfilling",
        "shipped",
        "delivered",
        "refunded",
        "canceled",
      ],
      product_status: ["draft", "active", "archived"],
    },
  },
} as const

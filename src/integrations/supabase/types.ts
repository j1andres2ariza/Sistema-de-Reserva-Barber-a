export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      whatsapp_notifications: {
        Row: {
          id: string;
          booking_id: string;
          recipient: string;
          phone: string;
          payload: Json;
          status: string;
          attempts: number;
          next_attempt_at: string;
          locked_until: string | null;
          lease_token: string | null;
          provider_message_id: string | null;
          last_error_code: string | null;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          recipient: string;
          phone: string;
          payload: Json;
          status?: string;
          attempts?: number;
          next_attempt_at?: string;
          locked_until?: string | null;
          lease_token?: string | null;
          provider_message_id?: string | null;
          last_error_code?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          recipient?: string;
          phone?: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          next_attempt_at?: string;
          locked_until?: string | null;
          lease_token?: string | null;
          provider_message_id?: string | null;
          last_error_code?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      barber_schedules: {
        Row: {
          barber_id: string;
          close_time: string;
          created_at: string;
          day_of_week: number;
          id: string;
          is_available: boolean;
          open_time: string;
          updated_at: string;
        };
        Insert: {
          barber_id: string;
          close_time?: string;
          created_at?: string;
          day_of_week: number;
          id?: string;
          is_available?: boolean;
          open_time?: string;
          updated_at?: string;
        };
        Update: {
          barber_id?: string;
          close_time?: string;
          created_at?: string;
          day_of_week?: number;
          id?: string;
          is_available?: boolean;
          open_time?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      barbers: {
        Row: {
          commission_rate: number;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          photo_url: string | null;
          position: number;
          updated_at: string;
        };
        Insert: {
          commission_rate?: number;
          created_at?: string;
          id: string;
          is_active?: boolean;
          name: string;
          photo_url?: string | null;
          position: number;
          updated_at?: string;
        };
        Update: {
          commission_rate?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          photo_url?: string | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          barber_id: string;
          client_name: string;
          client_phone: string;
          created_at: string;
          date: string;
          duration_minutes: number;
          id: string;
          service_id: string;
          time: string;
        };
        Insert: {
          barber_id: string;
          client_name: string;
          client_phone: string;
          created_at?: string;
          date: string;
          duration_minutes?: number;
          id?: string;
          service_id: string;
          time: string;
        };
        Update: {
          barber_id?: string;
          client_name?: string;
          client_phone?: string;
          created_at?: string;
          date?: string;
          duration_minutes?: number;
          id?: string;
          service_id?: string;
          time?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          date: string;
          description: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          category?: string;
          created_at?: string;
          date: string;
          description: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          date?: string;
          description?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          category: string;
          cost: number;
          created_at: string;
          id: string;
          is_active: boolean;
          min_stock: number;
          name: string;
          price: number;
          stock: number;
          unit: string;
          updated_at: string;
        };
        Insert: {
          category?: string;
          cost?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          min_stock?: number;
          name: string;
          price?: number;
          stock?: number;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          cost?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          min_stock?: number;
          name?: string;
          price?: number;
          stock?: number;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sale_items: {
        Row: {
          created_at: string;
          id: string;
          item_ref: string | null;
          item_type: string;
          name: string;
          quantity: number;
          sale_id: string;
          subtotal: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_ref?: string | null;
          item_type?: string;
          name: string;
          quantity?: number;
          sale_id: string;
          subtotal?: number;
          unit_price?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_ref?: string | null;
          item_type?: string;
          name?: string;
          quantity?: number;
          sale_id?: string;
          subtotal?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          barber_id: string | null;
          client_name: string | null;
          created_at: string;
          date: string;
          id: string;
          notes: string | null;
          payment_method: string;
          total: number;
          updated_at: string;
        };
        Insert: {
          barber_id?: string | null;
          client_name?: string | null;
          created_at?: string;
          date: string;
          id?: string;
          notes?: string | null;
          payment_method?: string;
          total?: number;
          updated_at?: string;
        };
        Update: {
          barber_id?: string | null;
          client_name?: string | null;
          created_at?: string;
          date?: string;
          id?: string;
          notes?: string | null;
          payment_method?: string;
          total?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
          reason: string | null;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          quantity: number;
          reason?: string | null;
          type?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          reason?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_public_availability: {
        Args: Record<string, never>;
        Returns: {
          barber_id: string;
          booking_date: string;
          booking_time: string;
          duration_minutes: number;
        }[];
      };
      retry_whatsapp_notification: {
        Args: { p_id: string };
        Returns: undefined;
      };

      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;

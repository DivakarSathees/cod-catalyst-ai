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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_memory: {
        Row: {
          created_at: string
          id: string
          questions_asked: string[]
          ready_to_generate: boolean
          session_id: string
          updated_at: string
          user_answers: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          questions_asked?: string[]
          ready_to_generate?: boolean
          session_id: string
          updated_at?: string
          user_answers?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          questions_asked?: string[]
          ready_to_generate?: boolean
          session_id?: string
          updated_at?: string
          user_answers?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_memory_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_testcases: {
        Row: {
          category: string
          created_at: string
          description: string
          expected_input: string
          expected_output: string
          id: string
          session_id: string
          steps: string
          test_id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          expected_input?: string
          expected_output?: string
          id?: string
          session_id: string
          steps?: string
          test_id: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          expected_input?: string
          expected_output?: string
          id?: string
          session_id?: string
          steps?: string
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_testcases_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_descriptions: {
        Row: {
          constraints: string
          created_at: string
          expected_deliverables: string
          full_description: string
          functional_requirements: string
          id: string
          non_functional_requirements: string
          overview: string
          session_id: string
          technical_requirements: string
          updated_at: string
          user_id: string
        }
        Insert: {
          constraints?: string
          created_at?: string
          expected_deliverables?: string
          full_description?: string
          functional_requirements?: string
          id?: string
          non_functional_requirements?: string
          overview?: string
          session_id: string
          technical_requirements?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          constraints?: string
          created_at?: string
          expected_deliverables?: string
          full_description?: string
          functional_requirements?: string
          id?: string
          non_functional_requirements?: string
          overview?: string
          session_id?: string
          technical_requirements?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_descriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      testcase_configs: {
        Row: {
          api: boolean
          api_weight: number
          boundary: boolean
          boundary_weight: number
          created_at: string
          database: boolean
          database_weight: number
          end_to_end: boolean
          end_to_end_weight: number
          file_existence: boolean
          file_existence_weight: number
          functional: boolean
          functional_weight: number
          id: string
          method_existence: boolean
          method_existence_weight: number
          negative: boolean
          negative_weight: number
          performance: boolean
          performance_weight: number
          security: boolean
          security_weight: number
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api?: boolean
          api_weight?: number
          boundary?: boolean
          boundary_weight?: number
          created_at?: string
          database?: boolean
          database_weight?: number
          end_to_end?: boolean
          end_to_end_weight?: number
          file_existence?: boolean
          file_existence_weight?: number
          functional?: boolean
          functional_weight?: number
          id?: string
          method_existence?: boolean
          method_existence_weight?: number
          negative?: boolean
          negative_weight?: number
          performance?: boolean
          performance_weight?: number
          security?: boolean
          security_weight?: number
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api?: boolean
          api_weight?: number
          boundary?: boolean
          boundary_weight?: number
          created_at?: string
          database?: boolean
          database_weight?: number
          end_to_end?: boolean
          end_to_end_weight?: number
          file_existence?: boolean
          file_existence_weight?: number
          functional?: boolean
          functional_weight?: number
          id?: string
          method_existence?: boolean
          method_existence_weight?: number
          negative?: boolean
          negative_weight?: number
          performance?: boolean
          performance_weight?: number
          security?: boolean
          security_weight?: number
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testcase_configs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "chat_sessions"
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

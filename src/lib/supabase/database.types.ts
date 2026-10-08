// 자동 생성: Supabase DB 구조 → TypeScript 타입 (10/7, dev 프로젝트, 마이그레이션 3차까지). 직접 고치지 않는다
// 마이그레이션을 더하면 다시 만든다 (Supabase MCP generate_typescript_types 또는 `supabase gen types typescript`)
// 주의: DB 함수의 인자는 null을 받아도 타입에는 string으로만 나온다 (login_attempt_begin의 p_ip 등)

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
      class_members: {
        Row: {
          class_id: string
          joined_on: string
          left_on: string | null
          student_id: string
        }
        Insert: {
          class_id: string
          joined_on?: string
          left_on?: string | null
          student_id: string
        }
        Update: {
          class_id?: string
          joined_on?: string
          left_on?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          id: string
          is_active: boolean
          name: string
          sort_order: number
          teacher_id: string | null
          weekdays: number[]
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          teacher_id?: string | null
          weekdays?: number[]
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          teacher_id?: string | null
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_students: {
        Row: {
          guardian_id: string
          is_primary: boolean
          notify_attendance: boolean
          student_id: string
        }
        Insert: {
          guardian_id: string
          is_primary?: boolean
          notify_attendance?: boolean
          student_id: string
        }
        Update: {
          guardian_id?: string
          is_primary?: boolean
          notify_attendance?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_students_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          id: string
          name: string
          phone1: string | null
          phone2: string | null
          profile_id: string | null
          relation: Database["public"]["Enums"]["guardian_relation"] | null
        }
        Insert: {
          id?: string
          name: string
          phone1?: string | null
          phone2?: string | null
          profile_id?: string | null
          relation?: Database["public"]["Enums"]["guardian_relation"] | null
        }
        Update: {
          id?: string
          name?: string
          phone1?: string | null
          phone2?: string | null
          profile_id?: string | null
          relation?: Database["public"]["Enums"]["guardian_relation"] | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          fail_count: number
          locked_until: string | null
          login_id: string
          updated_at: string
        }
        Insert: {
          fail_count?: number
          locked_until?: string | null
          login_id: string
          updated_at?: string
        }
        Update: {
          fail_count?: number
          locked_until?: string | null
          login_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          login_id: string
          must_change_password: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          is_active?: boolean
          login_id: string
          must_change_password?: boolean
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          login_id?: string
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      student_schedules: {
        Row: {
          duration_min: number
          id: string
          start_time: string
          student_id: string
          weekday: number
        }
        Insert: {
          duration_min: number
          id?: string
          start_time: string
          student_id: string
          weekday: number
        }
        Update: {
          duration_min?: number
          id?: string
          start_time?: string
          student_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_schedules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          attendance_code: string
          birth_date: string | null
          created_at: string
          enrolled_on: string
          grade: string | null
          id: string
          left_on: string | null
          memo: string
          name: string
          phone: string | null
          profile_id: string | null
          programs: string[]
          school: string | null
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          attendance_code: string
          birth_date?: string | null
          created_at?: string
          enrolled_on?: string
          grade?: string | null
          id?: string
          left_on?: string | null
          memo?: string
          name: string
          phone?: string | null
          profile_id?: string | null
          programs?: string[]
          school?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          attendance_code?: string
          birth_date?: string | null
          created_at?: string
          enrolled_on?: string
          grade?: string | null
          id?: string
          left_on?: string | null
          memo?: string
          name?: string
          phone?: string | null
          profile_id?: string | null
          programs?: string[]
          school?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          id: string
          is_active: boolean
          nickname: string
          profile_id: string | null
          real_name: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          nickname: string
          profile_id?: string | null
          real_name: string
        }
        Update: {
          id?: string
          is_active?: boolean
          nickname?: string
          profile_id?: string | null
          real_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      teacher_public: {
        Row: {
          id: string | null
          nickname: string | null
        }
        Insert: {
          id?: string | null
          nickname?: string | null
        }
        Update: {
          id?: string | null
          nickname?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      login_attempt_begin: {
        Args: { p_id: string; p_ip: string }
        Returns: {
          allowed: boolean
          locked: boolean
        }[]
      }
      login_attempt_success: {
        Args: { p_id: string; p_ip: string }
        Returns: undefined
      }
      save_student_classes_schedule: {
        Args: { new_class_ids: string[]; new_slots: Json; sid: string }
        Returns: undefined
      }
      set_student_programs: {
        Args: { new_programs: string[]; sid: string }
        Returns: undefined
      }
    }
    Enums: {
      guardian_relation: "mother" | "father" | "other"
      student_status: "enrolled" | "on_leave" | "withdrawn" | "pending"
      user_role: "admin" | "teacher" | "student" | "parent" | "kiosk"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      guardian_relation: ["mother", "father", "other"],
      student_status: ["enrolled", "on_leave", "withdrawn", "pending"],
      user_role: ["admin", "teacher", "student", "parent", "kiosk"],
    },
  },
} as const

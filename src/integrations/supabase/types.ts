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
      attachments: {
        Row: {
          height: number | null
          id: string
          kind: string | null
          message_id: string
          mime: string | null
          name: string | null
          size: number | null
          url: string
          width: number | null
        }
        Insert: {
          height?: number | null
          id?: string
          kind?: string | null
          message_id: string
          mime?: string | null
          name?: string | null
          size?: number | null
          url: string
          width?: number | null
        }
        Update: {
          height?: number | null
          id?: string
          kind?: string | null
          message_id?: string
          mime?: string | null
          name?: string | null
          size?: number | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string | null
          id: string
          meta: Json | null
          space_id: string | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string | null
          id?: string
          meta?: Json | null
          space_id?: string | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string | null
          id?: string
          meta?: Json | null
          space_id?: string | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_webhook_tokens: {
        Row: {
          created_at: string
          token_hash: string
          webhook_id: string
        }
        Insert: {
          created_at?: string
          token_hash: string
          webhook_id: string
        }
        Update: {
          created_at?: string
          token_hash?: string
          webhook_id?: string
        }
        Relationships: []
      }
      bot_webhooks: {
        Row: {
          avatar_url: string | null
          channel_id: string | null
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          last_used_at: string | null
          name: string
          space_id: string
        }
        Insert: {
          avatar_url?: string | null
          channel_id?: string | null
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          last_used_at?: string | null
          name: string
          space_id: string
        }
        Update: {
          avatar_url?: string | null
          channel_id?: string | null
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          last_used_at?: string | null
          name?: string
          space_id?: string
        }
        Relationships: []
      }
      channel_access: {
        Row: {
          channel_id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_access_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_notifications: {
        Row: {
          channel_id: string
          last_read_at: string | null
          level: string
          user_id: string
        }
        Insert: {
          channel_id: string
          last_read_at?: string | null
          level?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          last_read_at?: string | null
          level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_notifications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_passwords: {
        Row: {
          channel_id: string
          password_hash: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          password_hash: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          body: Json | null
          created_at: string | null
          id: string
          name: string
          position: number
          space_id: string
          topic: string | null
          type: Database["public"]["Enums"]["channel_kind"]
        }
        Insert: {
          body?: Json | null
          created_at?: string | null
          id?: string
          name: string
          position?: number
          space_id: string
          topic?: string | null
          type?: Database["public"]["Enums"]["channel_kind"]
        }
        Update: {
          body?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          position?: number
          space_id?: string
          topic?: string | null
          type?: Database["public"]["Enums"]["channel_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "channels_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tags: {
        Row: {
          color: string | null
          id: string
          label: string
          space_id: string
          user_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          label: string
          space_id: string
          user_id: string
        }
        Update: {
          color?: string | null
          id?: string
          label?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_tags_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_participants: {
        Row: {
          accepted: boolean
          last_read_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          accepted?: boolean
          last_read_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          accepted?: boolean
          last_read_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          event_id: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          space_id: string
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          space_id: string
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          space_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      filters_blocked: {
        Row: {
          id: string
          space_id: string
          word: string
        }
        Insert: {
          id?: string
          space_id: string
          word: string
        }
        Update: {
          id?: string
          space_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "filters_blocked_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      filters_rate: {
        Row: {
          enabled: boolean | null
          max_msgs: number | null
          mute_seconds: number | null
          space_id: string
          window_seconds: number | null
        }
        Insert: {
          enabled?: boolean | null
          max_msgs?: number | null
          mute_seconds?: number | null
          space_id: string
          window_seconds?: number | null
        }
        Update: {
          enabled?: boolean | null
          max_msgs?: number | null
          mute_seconds?: number | null
          space_id?: string
          window_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "filters_rate_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: true
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_answers: {
        Row: {
          accepted: boolean
          body: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          accepted?: boolean
          body: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          accepted?: boolean
          body?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: []
      }
      forum_questions: {
        Row: {
          answered: boolean
          body: string
          created_at: string
          id: string
          space_id: string
          title: string
        }
        Insert: {
          answered?: boolean
          body?: string
          created_at?: string
          id?: string
          space_id: string
          title: string
        }
        Update: {
          answered?: boolean
          body?: string
          created_at?: string
          id?: string
          space_id?: string
          title?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          max_uses: number | null
          space_id: string
          uses: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          max_uses?: number | null
          space_id: string
          uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          max_uses?: number | null
          space_id?: string
          uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      member_tags: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          space_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          space_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          space_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          id: string
          message_id: string
          target: string
          user_id: string | null
        }
        Insert: {
          id?: string
          message_id: string
          target: string
          user_id?: string | null
        }
        Update: {
          id?: string
          message_id?: string
          target?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          body: string
          bot_name: string | null
          channel_id: string | null
          created_at: string | null
          deleted_at: string | null
          dm_thread_id: string | null
          edited_at: string | null
          id: string
          parent_id: string | null
          pinned: boolean | null
          search: unknown
        }
        Insert: {
          author_id: string
          body?: string
          bot_name?: string | null
          channel_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dm_thread_id?: string | null
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          pinned?: boolean | null
          search?: unknown
        }
        Update: {
          author_id?: string
          body?: string
          bot_name?: string | null
          channel_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dm_thread_id?: string | null
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          pinned?: boolean | null
          search?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_dm_thread_id_fkey"
            columns: ["dm_thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          position: number | null
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          position?: number | null
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          option_id: string
          poll_id: string
          rank: number | null
          user_id: string
        }
        Insert: {
          option_id: string
          poll_id: string
          rank?: number | null
          user_id: string
        }
        Update: {
          option_id?: string
          poll_id?: string
          rank?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closes_at: string | null
          id: string
          kind: Database["public"]["Enums"]["poll_kind"]
          message_id: string
          question: string
        }
        Insert: {
          closes_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["poll_kind"]
          message_id: string
          question: string
        }
        Update: {
          closes_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["poll_kind"]
          message_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string | null
          avatar_url: string | null
          created_at: string | null
          description: string | null
          display_name: string | null
          id: string
          status_emoji: string | null
          status_text: string | null
          username: string
        }
        Insert: {
          avatar_color?: string | null
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          id: string
          status_emoji?: string | null
          status_text?: string | null
          username: string
        }
        Update: {
          avatar_color?: string | null
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          status_emoji?: string | null
          status_text?: string | null
          username?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      site_answers: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "site_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_questions: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      space_join_codes: {
        Row: {
          join_code: string
          space_id: string
        }
        Insert: {
          join_code: string
          space_id: string
        }
        Update: {
          join_code?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_join_codes_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: true
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          banned: boolean
          joined_at: string | null
          muted_until: string | null
          role: Database["public"]["Enums"]["space_role"]
          space_id: string
          user_id: string
        }
        Insert: {
          banned?: boolean
          joined_at?: string | null
          muted_until?: string | null
          role?: Database["public"]["Enums"]["space_role"]
          space_id: string
          user_id: string
        }
        Update: {
          banned?: boolean
          joined_at?: string | null
          muted_until?: string | null
          role?: Database["public"]["Enums"]["space_role"]
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string | null
          description: string | null
          icon_bg: string | null
          icon_emoji: string | null
          icon_url: string | null
          id: string
          mention_all_policy: Database["public"]["Enums"]["mention_all_policy"]
          name: string
          owner_id: string
          slug: string
          visibility: Database["public"]["Enums"]["space_visibility"]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_bg?: string | null
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string
          mention_all_policy?: Database["public"]["Enums"]["mention_all_policy"]
          name: string
          owner_id: string
          slug: string
          visibility?: Database["public"]["Enums"]["space_visibility"]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_bg?: string | null
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string
          mention_all_policy?: Database["public"]["Enums"]["mention_all_policy"]
          name?: string
          owner_id?: string
          slug?: string
          visibility?: Database["public"]["Enums"]["space_visibility"]
        }
        Relationships: []
      }
      strikes: {
        Row: {
          count: number | null
          last_at: string | null
          space_id: string
          user_id: string
        }
        Insert: {
          count?: number | null
          last_at?: string | null
          space_id: string
          user_id: string
        }
        Update: {
          count?: number | null
          last_at?: string | null
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strikes_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      typing: {
        Row: {
          at: string | null
          channel_id: string | null
          dm_thread_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          at?: string | null
          channel_id?: string | null
          dm_thread_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          at?: string | null
          channel_id?: string | null
          dm_thread_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_dm_thread_id_fkey"
            columns: ["dm_thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_space_role: {
        Args: {
          _min: Database["public"]["Enums"]["space_role"]
          _space: string
          _user: string
        }
        Returns: boolean
      }
      is_dm_participant: {
        Args: { _thread: string; _user: string }
        Returns: boolean
      }
      is_dm_participant_any: {
        Args: { _thread: string; _user: string }
        Returns: boolean
      }
      is_space_member: {
        Args: { _space: string; _user: string }
        Returns: boolean
      }
      message_visible: {
        Args: {
          _msg: Database["public"]["Tables"]["messages"]["Row"]
          _user: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin"
      channel_kind: "general" | "announcement" | "rules" | "links" | "locked"
      mention_all_policy: "owners" | "managers" | "everyone"
      poll_kind: "single" | "multi" | "ranked"
      space_role: "member" | "manager" | "owner"
      space_visibility: "public" | "private"
      theme_pref: "system" | "light" | "dark"
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
      app_role: ["user", "admin"],
      channel_kind: ["general", "announcement", "rules", "links", "locked"],
      mention_all_policy: ["owners", "managers", "everyone"],
      poll_kind: ["single", "multi", "ranked"],
      space_role: ["member", "manager", "owner"],
      space_visibility: ["public", "private"],
      theme_pref: ["system", "light", "dark"],
    },
  },
} as const

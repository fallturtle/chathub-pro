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
      ban_appeals: {
        Row: {
          admin_notes: string | null
          body: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          body: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          body?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          message_id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_channels: {
        Row: {
          channel_id: string
          webhook_id: string
        }
        Insert: {
          channel_id: string
          webhook_id: string
        }
        Update: {
          channel_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_channels_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "bot_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_rules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          match_type: string
          response: string
          trigger: string
          webhook_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          match_type?: string
          response: string
          trigger: string
          webhook_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          match_type?: string
          response?: string
          trigger?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_rules_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "bot_webhooks"
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
          posts_everywhere: boolean
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
          posts_everywhere?: boolean
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
          posts_everywhere?: boolean
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
          archived: boolean
          body: Json | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          position: number
          slowmode_seconds: number
          space_id: string
          topic: string | null
          type: Database["public"]["Enums"]["channel_kind"]
        }
        Insert: {
          archived?: boolean
          body?: Json | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          position?: number
          slowmode_seconds?: number
          space_id: string
          topic?: string | null
          type?: Database["public"]["Enums"]["channel_kind"]
        }
        Update: {
          archived?: boolean
          body?: Json | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          position?: number
          slowmode_seconds?: number
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
      ip_bans: {
        Row: {
          created_at: string
          created_by: string | null
          ip: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ip: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          created_at: string
          id: string
          requested_by: string
          requested_user_id: string
          space_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_by: string
          requested_user_id: string
          space_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_by?: string
          requested_user_id?: string
          space_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_space_id_fkey"
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
          anonymous: boolean
          closes_at: string | null
          id: string
          kind: Database["public"]["Enums"]["poll_kind"]
          message_id: string
          question: string
        }
        Insert: {
          anonymous?: boolean
          closes_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["poll_kind"]
          message_id: string
          question: string
        }
        Update: {
          anonymous?: boolean
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
          accent_color: string | null
          avatar_color: string | null
          avatar_url: string | null
          created_at: string | null
          density: string | null
          description: string | null
          display_name: string | null
          font_pref: string | null
          id: string
          status_emoji: string | null
          status_text: string | null
          username: string
        }
        Insert: {
          accent_color?: string | null
          avatar_color?: string | null
          avatar_url?: string | null
          created_at?: string | null
          density?: string | null
          description?: string | null
          display_name?: string | null
          font_pref?: string | null
          id: string
          status_emoji?: string | null
          status_text?: string | null
          username: string
        }
        Update: {
          accent_color?: string | null
          avatar_color?: string | null
          avatar_url?: string | null
          created_at?: string | null
          density?: string | null
          description?: string | null
          display_name?: string | null
          font_pref?: string | null
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
      reports: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          reason: string
          reporter_id: string
          space_id: string
          status: string
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          reason: string
          reporter_id: string
          space_id: string
          status?: string
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          reason?: string
          reporter_id?: string
          space_id?: string
          status?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          author_id: string
          body: string
          channel_id: string | null
          created_at: string
          dm_thread_id: string | null
          id: string
          send_at: string
          sent_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          channel_id?: string | null
          created_at?: string
          dm_thread_id?: string | null
          id?: string
          send_at: string
          sent_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          channel_id?: string | null
          created_at?: string
          dm_thread_id?: string | null
          id?: string
          send_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_dm_thread_id_fkey"
            columns: ["dm_thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
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
      site_bans: {
        Row: {
          banned_at: string
          banned_by: string | null
          reason: string
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          reason?: string
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
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
      site_reports: {
        Row: {
          created_at: string
          details: string
          escalator_id: string
          id: string
          reason: string
          source_report_id: string | null
          space_id: string | null
          status: string
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          details: string
          escalator_id: string
          id?: string
          reason: string
          source_report_id?: string | null
          space_id?: string | null
          status?: string
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string
          escalator_id?: string
          id?: string
          reason?: string
          source_report_id?: string | null
          space_id?: string | null
          status?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_reports_source_report_id_fkey"
            columns: ["source_report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_reports_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: number
          owner_user_id: string | null
          updated_at: string
        }
        Insert: {
          id: number
          owner_user_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          owner_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      space_commands: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          response: string
          space_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          response: string
          space_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          response?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_commands_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_emojis: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          space_id: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          space_id: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          space_id?: string
          url?: string
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
          automod_preset: string
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
          automod_preset?: string
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
          automod_preset?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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

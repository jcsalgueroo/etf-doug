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
      etf_master: {
        Row: {
          active_or_passive: string | null
          approved_at: string | null
          asset_class: string | null
          aum: number | null
          aum_as_of_date: string | null
          aum_currency: string | null
          base_currency: string | null
          benchmark_name: string | null
          created_at: string
          currency_hedged: boolean | null
          cusip: string | null
          data_quality_status: string
          distribution_policy: string | null
          domicile: string | null
          esg_or_climate_designation: string | null
          exchange: string | null
          family_key: string | null
          family_size: number | null
          field_provenance: Json
          fund_name: string
          geographic_exposure: string | null
          id: string
          index_methodology_summary: string | null
          index_provider: string | null
          is_ishares: boolean
          isin: string
          issuer: string | null
          last_refreshed_at: string | null
          launch_date: string | null
          legal_wrapper: string | null
          listing_country: string | null
          management_fee_bps: number | null
          management_fee_effective_date: string | null
          manager: string | null
          market_exposure: string | null
          rebalance_frequency: string | null
          replication_method: string | null
          sector_exposure: string | null
          sedol: string | null
          share_class: string | null
          source_universe: string
          style_or_factor: string | null
          sub_asset_class: string | null
          ticker: string
          trading_currency: string | null
          updated_at: string
        }
        Insert: {
          active_or_passive?: string | null
          approved_at?: string | null
          asset_class?: string | null
          aum?: number | null
          aum_as_of_date?: string | null
          aum_currency?: string | null
          base_currency?: string | null
          benchmark_name?: string | null
          created_at?: string
          currency_hedged?: boolean | null
          cusip?: string | null
          data_quality_status?: string
          distribution_policy?: string | null
          domicile?: string | null
          esg_or_climate_designation?: string | null
          exchange?: string | null
          family_key?: string | null
          family_size?: number | null
          field_provenance?: Json
          fund_name: string
          geographic_exposure?: string | null
          id: string
          index_methodology_summary?: string | null
          index_provider?: string | null
          is_ishares: boolean
          isin: string
          issuer?: string | null
          last_refreshed_at?: string | null
          launch_date?: string | null
          legal_wrapper?: string | null
          listing_country?: string | null
          management_fee_bps?: number | null
          management_fee_effective_date?: string | null
          manager?: string | null
          market_exposure?: string | null
          rebalance_frequency?: string | null
          replication_method?: string | null
          sector_exposure?: string | null
          sedol?: string | null
          share_class?: string | null
          source_universe: string
          style_or_factor?: string | null
          sub_asset_class?: string | null
          ticker: string
          trading_currency?: string | null
          updated_at?: string
        }
        Update: {
          active_or_passive?: string | null
          approved_at?: string | null
          asset_class?: string | null
          aum?: number | null
          aum_as_of_date?: string | null
          aum_currency?: string | null
          base_currency?: string | null
          benchmark_name?: string | null
          created_at?: string
          currency_hedged?: boolean | null
          cusip?: string | null
          data_quality_status?: string
          distribution_policy?: string | null
          domicile?: string | null
          esg_or_climate_designation?: string | null
          exchange?: string | null
          family_key?: string | null
          family_size?: number | null
          field_provenance?: Json
          fund_name?: string
          geographic_exposure?: string | null
          id?: string
          index_methodology_summary?: string | null
          index_provider?: string | null
          is_ishares?: boolean
          isin?: string
          issuer?: string | null
          last_refreshed_at?: string | null
          launch_date?: string | null
          legal_wrapper?: string | null
          listing_country?: string | null
          management_fee_bps?: number | null
          management_fee_effective_date?: string | null
          manager?: string | null
          market_exposure?: string | null
          rebalance_frequency?: string | null
          replication_method?: string | null
          sector_exposure?: string | null
          sedol?: string | null
          share_class?: string | null
          source_universe?: string
          style_or_factor?: string | null
          sub_asset_class?: string | null
          ticker?: string
          trading_currency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      etf_snapshots: {
        Row: {
          created_at: string
          etf_id: string
          fixed_income_attributes: Json | null
          holdings_summary: Json | null
          id: string
          performance: Json | null
          retrieval_metadata: Json | null
          snapshot_date: string
          source_urls: Json | null
        }
        Insert: {
          created_at?: string
          etf_id: string
          fixed_income_attributes?: Json | null
          holdings_summary?: Json | null
          id?: string
          performance?: Json | null
          retrieval_metadata?: Json | null
          snapshot_date: string
          source_urls?: Json | null
        }
        Update: {
          created_at?: string
          etf_id?: string
          fixed_income_attributes?: Json | null
          holdings_summary?: Json | null
          id?: string
          performance?: Json | null
          retrieval_metadata?: Json | null
          snapshot_date?: string
          source_urls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "etf_snapshots_etf_id_fkey"
            columns: ["etf_id"]
            isOneToOne: false
            referencedRelation: "etf_master"
            referencedColumns: ["id"]
          },
        ]
      }
      explanation_requests: {
        Row: {
          comparison_snapshot_id: string | null
          created_at: string
          id: string
          model: string | null
          prompt_version: string | null
          response: Json | null
          user_id: string | null
        }
        Insert: {
          comparison_snapshot_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          prompt_version?: string | null
          response?: Json | null
          user_id?: string | null
        }
        Update: {
          comparison_snapshot_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          prompt_version?: string | null
          response?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "explanation_requests_comparison_snapshot_id_fkey"
            columns: ["comparison_snapshot_id"]
            isOneToOne: false
            referencedRelation: "substitution_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_jobs: {
        Row: {
          completed_at: string | null
          id: string
          requested_at: string
          source_results: Json | null
          status: string
          ticker: string | null
          validation_flags: Json | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          requested_at?: string
          source_results?: Json | null
          status?: string
          ticker?: string | null
          validation_flags?: Json | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          requested_at?: string
          source_results?: Json | null
          status?: string
          ticker?: string | null
          validation_flags?: Json | null
        }
        Relationships: []
      }
      substitution_scores: {
        Row: {
          approval_status: string | null
          calculated_at: string
          candidate_etf_id: string
          eligibility_checks_skipped: Json | null
          eligibility_status: string
          exposure_score: number | null
          holdings_score: number | null
          id: string
          implementation_score: number | null
          methodology_score: number | null
          model_version: string
          reason_codes: Json | null
          reviewed_by: string | null
          score_completeness_pct: number | null
          source_etf_id: string
          total_score: number | null
          wrapper_score: number | null
        }
        Insert: {
          approval_status?: string | null
          calculated_at?: string
          candidate_etf_id: string
          eligibility_checks_skipped?: Json | null
          eligibility_status: string
          exposure_score?: number | null
          holdings_score?: number | null
          id?: string
          implementation_score?: number | null
          methodology_score?: number | null
          model_version: string
          reason_codes?: Json | null
          reviewed_by?: string | null
          score_completeness_pct?: number | null
          source_etf_id: string
          total_score?: number | null
          wrapper_score?: number | null
        }
        Update: {
          approval_status?: string | null
          calculated_at?: string
          candidate_etf_id?: string
          eligibility_checks_skipped?: Json | null
          eligibility_status?: string
          exposure_score?: number | null
          holdings_score?: number | null
          id?: string
          implementation_score?: number | null
          methodology_score?: number | null
          model_version?: string
          reason_codes?: Json | null
          reviewed_by?: string | null
          score_completeness_pct?: number | null
          source_etf_id?: string
          total_score?: number | null
          wrapper_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "substitution_scores_candidate_etf_id_fkey"
            columns: ["candidate_etf_id"]
            isOneToOne: false
            referencedRelation: "etf_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitution_scores_source_etf_id_fkey"
            columns: ["source_etf_id"]
            isOneToOne: false
            referencedRelation: "etf_master"
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
    Enums: {},
  },
} as const

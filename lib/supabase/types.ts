// Hand-rolled Database type — narrow to the wedding-app tables (hyrox shares the project).

export type SectionKey =
  | "decor"
  | "entertainment"
  | "photography"
  | "attire"
  | "travel"
  | "rituals"
  | "gifting"
  | "misc";

export type LineSource = "Confirmed" | "Estimate";

export type Database = {
  public: {
    Tables: {
      wedding_profiles: {
        Row: { id: string; display_name: string; created_at: string };
        Insert: { id: string; display_name?: string };
        Update: { display_name?: string };
        Relationships: [];
      };
      weddings: {
        Row: {
          id: string;
          owner_id: string;
          bride_name: string;
          groom_name: string;
          venue: string;
          start_date: string | null;
          end_date: string | null;
          guests: number;
          events: number;
          rooms_nights: number;
          rooms_gst_pct: number;
          contingency_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          bride_name?: string;
          groom_name?: string;
          venue?: string;
          start_date?: string | null;
          end_date?: string | null;
          guests?: number;
          events?: number;
          rooms_nights?: number;
          rooms_gst_pct?: number;
          contingency_pct?: number;
        };
        Update: Partial<{
          bride_name: string;
          groom_name: string;
          venue: string;
          start_date: string | null;
          end_date: string | null;
          guests: number;
          events: number;
          rooms_nights: number;
          rooms_gst_pct: number;
          contingency_pct: number;
        }>;
        Relationships: [];
      };
      wedding_rooms: {
        Row: {
          id: string;
          wedding_id: string;
          label: string;
          count: number;
          rate_per_night: number;
          position: number;
        };
        Insert: {
          wedding_id: string;
          label?: string;
          count?: number;
          rate_per_night?: number;
          position?: number;
        };
        Update: Partial<{ label: string; count: number; rate_per_night: number; position: number }>;
        Relationships: [];
      };
      wedding_meals: {
        Row: {
          id: string;
          wedding_id: string;
          label: string;
          pax: number;
          rate_per_head: number;
          tax_pct: number;
          sittings: number;
          position: number;
        };
        Insert: {
          wedding_id: string;
          label?: string;
          pax?: number;
          rate_per_head?: number;
          tax_pct?: number;
          sittings?: number;
          position?: number;
        };
        Update: Partial<{
          label: string;
          pax: number;
          rate_per_head: number;
          tax_pct: number;
          sittings: number;
          position: number;
        }>;
        Relationships: [];
      };
      wedding_lines: {
        Row: {
          id: string;
          wedding_id: string;
          section: SectionKey;
          label: string;
          amount: number;
          source: LineSource;
          note: string | null;
          position: number;
        };
        Insert: {
          wedding_id: string;
          section: SectionKey;
          label?: string;
          amount?: number;
          source?: LineSource;
          note?: string | null;
          position?: number;
        };
        Update: Partial<{
          section: SectionKey;
          label: string;
          amount: number;
          source: LineSource;
          note: string | null;
          position: number;
        }>;
        Relationships: [];
      };
    };
  };
};

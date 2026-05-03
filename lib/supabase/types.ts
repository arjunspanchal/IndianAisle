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

export type WeddingRole = "couple" | "planner" | "family_or_friend";
export type WeddingType = "local" | "destination";
export type WeddingTradition = "hindu_indian" | "muslim_indian" | "catholic";

export type RsvpStatus = "pending" | "accepted" | "declined" | "maybe";
export type GuestSide = "" | "bride" | "groom" | "both";

export type PropertyStatus =
  | "Not contacted"
  | "Inquired"
  | "Visited"
  | "Shortlisted"
  | "Booked"
  | "Rejected";

export type VendorCategory =
  | "meals"
  | "decor"
  | "entertainment"
  | "photography"
  | "attire"
  | "travel"
  | "rituals"
  | "gifting"
  | "misc";

export type VendorStatus =
  | "Not contacted"
  | "Inquired"
  | "Quoted"
  | "Booked"
  | "Rejected";

export type VendorRateType = "fixed" | "per_event" | "per_day";

type Empty = { [_ in never]: never };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      wedding_profiles: {
        Row: {
          id: string;
          display_name: string;
          role: WeddingRole;
          company_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          role?: WeddingRole;
          company_name?: string;
        };
        Update: {
          display_name?: string;
          role?: WeddingRole;
          company_name?: string;
        };
        Relationships: [];
      };
      user_memory: {
        Row: {
          id: string;
          user_id: string;
          fact: string;
          category: string | null;
          created_at: string;
        };
        Insert: { user_id: string; fact: string; category?: string | null };
        Update: Partial<{ fact: string; category: string | null }>;
        Relationships: [];
      };
      weddings: {
        Row: {
          id: string;
          owner_id: string;
          role: WeddingRole;
          couple_names: string;
          wedding_date: string | null;
          wedding_type: WeddingType;
          tradition: WeddingTradition | null;
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
          role: WeddingRole;
          couple_names: string;
          wedding_date?: string | null;
          wedding_type: WeddingType;
          tradition?: WeddingTradition | null;
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
          role: WeddingRole;
          couple_names: string;
          wedding_date: string | null;
          wedding_type: WeddingType;
          tradition: WeddingTradition | null;
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
      wedding_events: {
        Row: {
          id: string;
          wedding_id: string;
          name: string;
          space: string;
          event_date: string | null;
          position: number;
        };
        Insert: {
          wedding_id: string;
          name?: string;
          space?: string;
          event_date?: string | null;
          position?: number;
        };
        Update: Partial<{
          name: string;
          space: string;
          event_date: string | null;
          position: number;
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
      wedding_guests: {
        Row: {
          id: string;
          wedding_id: string;
          name: string;
          guest_type: string;
          side: GuestSide;
          address: string;
          phone: string;
          email: string;
          invited: boolean;
          rsvp_status: RsvpStatus;
          hotel_required: boolean;
          arrival_date: string | null;
          plus_ones: number;
          notes: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wedding_id: string;
          name?: string;
          guest_type?: string;
          side?: GuestSide;
          address?: string;
          phone?: string;
          email?: string;
          invited?: boolean;
          rsvp_status?: RsvpStatus;
          hotel_required?: boolean;
          arrival_date?: string | null;
          plus_ones?: number;
          notes?: string;
          position?: number;
        };
        Update: Partial<{
          name: string;
          guest_type: string;
          side: GuestSide;
          address: string;
          phone: string;
          email: string;
          invited: boolean;
          rsvp_status: RsvpStatus;
          hotel_required: boolean;
          arrival_date: string | null;
          plus_ones: number;
          notes: string;
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
      wedding_properties: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          location: string;
          address: string;
          website: string;
          contact_name: string;
          contact_phone: string;
          contact_email: string;
          rooms: number;
          max_guests: number | null;
          event_spaces: number | null;
          tier: 1 | 2 | 3;
          banquet: boolean;
          lawn: boolean;
          poolside: boolean;
          mandap: boolean;
          bridal_suite: boolean;
          air_conditioned: boolean;
          in_house_catering: boolean;
          outside_catering_allowed: boolean;
          outside_decor_allowed: boolean;
          liquor_license: boolean;
          avg_room_rate: number | null;
          banquet_rental: number | null;
          per_plate_cost: number | null;
          buyout_cost: number | null;
          parking_spots: number | null;
          airport_km: number | null;
          status: PropertyStatus | null;
          rating: number;
          visited: boolean;
          notes: string;
          position: number;
          lat: number | null;
          lng: number | null;
          place_id: string | null;
          nearest_airport_name: string | null;
          nearest_airport_place_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          name?: string;
          location?: string;
          address?: string;
          website?: string;
          contact_name?: string;
          contact_phone?: string;
          contact_email?: string;
          rooms?: number;
          max_guests?: number | null;
          event_spaces?: number | null;
          tier?: 1 | 2 | 3;
          banquet?: boolean;
          lawn?: boolean;
          poolside?: boolean;
          mandap?: boolean;
          bridal_suite?: boolean;
          air_conditioned?: boolean;
          in_house_catering?: boolean;
          outside_catering_allowed?: boolean;
          outside_decor_allowed?: boolean;
          liquor_license?: boolean;
          avg_room_rate?: number | null;
          banquet_rental?: number | null;
          per_plate_cost?: number | null;
          buyout_cost?: number | null;
          parking_spots?: number | null;
          airport_km?: number | null;
          status?: PropertyStatus | null;
          rating?: number;
          visited?: boolean;
          notes?: string;
          position?: number;
          lat?: number | null;
          lng?: number | null;
          place_id?: string | null;
          nearest_airport_name?: string | null;
          nearest_airport_place_id?: string | null;
        };
        Update: Partial<{
          name: string;
          location: string;
          address: string;
          website: string;
          contact_name: string;
          contact_phone: string;
          contact_email: string;
          rooms: number;
          max_guests: number | null;
          event_spaces: number | null;
          tier: 1 | 2 | 3;
          banquet: boolean;
          lawn: boolean;
          poolside: boolean;
          mandap: boolean;
          bridal_suite: boolean;
          air_conditioned: boolean;
          in_house_catering: boolean;
          outside_catering_allowed: boolean;
          outside_decor_allowed: boolean;
          liquor_license: boolean;
          avg_room_rate: number | null;
          banquet_rental: number | null;
          per_plate_cost: number | null;
          buyout_cost: number | null;
          parking_spots: number | null;
          airport_km: number | null;
          status: PropertyStatus | null;
          rating: number;
          visited: boolean;
          notes: string;
          position: number;
          lat: number | null;
          lng: number | null;
          place_id: string | null;
          nearest_airport_name: string | null;
          nearest_airport_place_id: string | null;
        }>;
        Relationships: [];
      };
      wedding_vendors: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          category: VendorCategory;
          quote_amount: number;
          rate_type: VendorRateType;
          contact_name: string;
          contact_phone: string;
          contact_email: string;
          website: string;
          status: VendorStatus | null;
          rating: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          name: string;
          category: VendorCategory;
          quote_amount?: number;
          rate_type?: VendorRateType;
          contact_name?: string;
          contact_phone?: string;
          contact_email?: string;
          website?: string;
          status?: VendorStatus | null;
          rating?: number;
          notes?: string;
        };
        Update: Partial<{
          name: string;
          category: VendorCategory;
          quote_amount: number;
          rate_type: VendorRateType;
          contact_name: string;
          contact_phone: string;
          contact_email: string;
          website: string;
          status: VendorStatus | null;
          rating: number;
          notes: string;
        }>;
        Relationships: [];
      };
      wedding_collaborators: {
        Row: {
          wedding_id: string;
          user_id: string;
          added_at: string;
          added_by: string | null;
        };
        Insert: {
          wedding_id: string;
          user_id: string;
          added_by?: string | null;
        };
        Update: Partial<{ added_by: string | null }>;
        Relationships: [];
      };
    };
    Views: Empty;
    Functions: {
      delete_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      add_wedding_collaborator_by_email: {
        Args: { p_wedding_id: string; p_email: string };
        Returns: { user_id: string; email: string }[];
      };
      list_wedding_collaborators: {
        Args: { p_wedding_id: string };
        Returns: { user_id: string; email: string; added_at: string }[];
      };
      remove_wedding_collaborator: {
        Args: { p_wedding_id: string; p_user_id: string };
        Returns: void;
      };
      user_can_access_wedding: {
        Args: { p_wedding_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      wedding_section: SectionKey;
      wedding_line_source: LineSource;
    };
    CompositeTypes: Empty;
  };
};

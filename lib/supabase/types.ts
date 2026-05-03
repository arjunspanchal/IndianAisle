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

export type UserTier = "free" | "pro";

export type CuratedVendorTier = "signature" | "established" | "emerging";
export type CuratedPriceBand = "budget" | "mid" | "premium" | "luxury";
export type CuratedSaveStatus =
  | "saved"
  | "inquired"
  | "shortlisted"
  | "booked"
  | "passed";

/** Vendor reference on a budget line — discriminator between personal and curated tables. */
export type LineVendorSource = "personal" | "curated";

// --- Vendor portal (Module 1) -------------------------------------------------

export type VendorListingStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

export type VendorListingTier = "free" | "premium";

export type VendorRole = "owner" | "manager" | "staff";

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
          tier: UserTier;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          role?: WeddingRole;
          company_name?: string;
          tier?: UserTier;
          is_admin?: boolean;
        };
        Update: {
          display_name?: string;
          role?: WeddingRole;
          company_name?: string;
          tier?: UserTier;
          is_admin?: boolean;
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
          name: string;
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
          name?: string;
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
          name: string;
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
          /** Optional reference to a vendor record. Both fields move together. */
          vendor_id: string | null;
          vendor_source: LineVendorSource | null;
        };
        Insert: {
          wedding_id: string;
          section: SectionKey;
          label?: string;
          amount?: number;
          source?: LineSource;
          note?: string | null;
          position?: number;
          vendor_id?: string | null;
          vendor_source?: LineVendorSource | null;
        };
        Update: Partial<{
          section: SectionKey;
          label: string;
          amount: number;
          source: LineSource;
          note: string | null;
          position: number;
          vendor_id: string | null;
          vendor_source: LineVendorSource | null;
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
      curated_vendors: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: VendorCategory;
          vendor_tier: CuratedVendorTier;
          price_band: CuratedPriceBand | null;
          quote_amount: number;
          rate_type: VendorRateType;
          base_city: string;
          regions_served: string[];
          travels_for_destination: boolean;
          tagline: string;
          about: string;
          strengths: string[];
          contact_name: string;
          contact_phone: string;
          contact_email: string;
          website: string;
          instagram: string;
          /** Legacy single-line region — kept for one release as a safety net; drops in 0011. */
          region: string;
          image_url: string;
          hero_image_url: string;
          is_featured: boolean;
          is_verified: boolean;
          display_order: number;
          // Module 1 vendor-portal columns:
          listing_status: VendorListingStatus;
          listing_tier: VendorListingTier;
          country_code: string | null;
          latitude: number | null;
          longitude: number | null;
          submitted_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          rejection_reason: string | null;
          claimed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          category?: VendorCategory;
          vendor_tier?: CuratedVendorTier;
          price_band?: CuratedPriceBand | null;
          quote_amount?: number;
          rate_type?: VendorRateType;
          base_city?: string;
          regions_served?: string[];
          travels_for_destination?: boolean;
          tagline?: string;
          about?: string;
          strengths?: string[];
          contact_name?: string;
          contact_phone?: string;
          contact_email?: string;
          website?: string;
          instagram?: string;
          region?: string;
          image_url?: string;
          hero_image_url?: string;
          is_featured?: boolean;
          is_verified?: boolean;
          display_order?: number;
          listing_status?: VendorListingStatus;
          listing_tier?: VendorListingTier;
          country_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
          claimed_at?: string | null;
        };
        Update: Partial<{
          name: string;
          slug: string;
          category: VendorCategory;
          vendor_tier: CuratedVendorTier;
          price_band: CuratedPriceBand | null;
          quote_amount: number;
          rate_type: VendorRateType;
          base_city: string;
          regions_served: string[];
          travels_for_destination: boolean;
          tagline: string;
          about: string;
          strengths: string[];
          contact_name: string;
          contact_phone: string;
          contact_email: string;
          website: string;
          instagram: string;
          region: string;
          image_url: string;
          hero_image_url: string;
          is_featured: boolean;
          is_verified: boolean;
          display_order: number;
          listing_status: VendorListingStatus;
          listing_tier: VendorListingTier;
          country_code: string | null;
          latitude: number | null;
          longitude: number | null;
          submitted_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          rejection_reason: string | null;
          claimed_at: string | null;
        }>;
        Relationships: [];
      };
      curated_vendor_images: {
        Row: {
          id: string;
          vendor_id: string;
          url: string;
          caption: string;
          kind: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          vendor_id: string;
          url: string;
          caption?: string;
          kind?: string;
          sort_order?: number;
        };
        Update: Partial<{
          url: string;
          caption: string;
          kind: string;
          sort_order: number;
        }>;
        Relationships: [];
      };
      curated_vendor_saves: {
        Row: {
          id: string;
          user_id: string;
          /** Null when the save is global to the user (v1 default). */
          wedding_id: string | null;
          vendor_id: string;
          status: CuratedSaveStatus;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          wedding_id?: string | null;
          vendor_id: string;
          status?: CuratedSaveStatus;
          notes?: string;
        };
        Update: Partial<{
          status: CuratedSaveStatus;
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
      wedding_tasks: {
        Row: {
          id: string;
          wedding_id: string;
          title: string;
          due_date: string | null;
          completed_at: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wedding_id: string;
          title?: string;
          due_date?: string | null;
          completed_at?: string | null;
          position?: number;
        };
        Update: Partial<{
          title: string;
          due_date: string | null;
          completed_at: string | null;
          position: number;
        }>;
        Relationships: [];
      };
      // --- Module 1: vendor portal --------------------------------------------
      admins: {
        Row: {
          user_id: string;
          granted_by: string | null;
          granted_at: string;
          notes: string | null;
        };
        Insert: { user_id: string; granted_by?: string | null; notes?: string | null };
        Update: Partial<{ granted_by: string | null; notes: string | null }>;
        Relationships: [];
      };
      vendor_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          display_order: number;
          icon: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { slug: string; name: string; display_order?: number; icon?: string | null };
        Update: Partial<{ slug: string; name: string; display_order: number; icon: string | null }>;
        Relationships: [];
      };
      vendor_to_category: {
        Row: {
          vendor_id: string;
          category_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: { vendor_id: string; category_id: string; is_primary?: boolean };
        Update: Partial<{ is_primary: boolean }>;
        Relationships: [];
      };
      vendor_users: {
        Row: {
          id: string;
          vendor_id: string;
          user_id: string;
          role: VendorRole;
          invited_by: string | null;
          invited_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          vendor_id: string;
          user_id: string;
          role?: VendorRole;
          invited_by?: string | null;
          accepted_at?: string | null;
        };
        Update: Partial<{
          role: VendorRole;
          accepted_at: string | null;
        }>;
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
        Returns: { o_user_id: string; o_email: string }[];
      };
      list_wedding_collaborators: {
        Args: { p_wedding_id: string };
        Returns: { o_user_id: string; o_email: string; o_added_at: string }[];
      };
      remove_wedding_collaborator: {
        Args: { p_wedding_id: string; p_user_id: string };
        Returns: void;
      };
      user_can_access_wedding: {
        Args: { p_wedding_id: string };
        Returns: boolean;
      };
      get_curated_vendor_display: {
        Args: { p_vendor_id: string };
        Returns: { id: string; name: string; category: string; base_city: string }[];
      };
      // Module 1 — vendor portal helpers
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_vendor_member: {
        Args: { p_vendor_id: string };
        Returns: boolean;
      };
      is_vendor_admin_role: {
        Args: { p_vendor_id: string };
        Returns: boolean;
      };
      // Atomic onboarding: creates curated_vendors row + vendor_users(owner) +
      // vendor_to_category bindings (primary + secondaries) under RLS.
      create_vendor_with_owner: {
        Args: {
          p_name: string;
          p_slug: string;
          p_about: string;
          p_country_code: string;
          p_base_city: string;
          p_contact_email: string;
          p_contact_phone: string;
          p_website: string;
          p_primary_category_id: string;
          p_secondary_category_ids: string[];
        };
        Returns: string;
      };
    };
    Enums: {
      wedding_section: SectionKey;
      wedding_line_source: LineSource;
    };
    CompositeTypes: Empty;
  };
};

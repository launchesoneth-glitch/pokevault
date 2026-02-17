export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          country_code: string;
          preferred_language: string;
          stripe_customer_id: string | null;
          stripe_connect_account_id: string | null;
          xp: number;
          tier: "trainer" | "gym_leader" | "elite_four" | "champion" | "professor";
          total_sales_volume: number;
          total_purchases_volume: number;
          total_transactions: number;
          is_verified: boolean;
          is_admin: boolean;
          is_premium_member: boolean;
          premium_expires_at: string | null;
          referral_code: string | null;
          referred_by: string | null;
          login_streak: number;
          last_login_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          country_code: string;
          preferred_language?: string;
          stripe_customer_id?: string | null;
          stripe_connect_account_id?: string | null;
          xp?: number;
          tier?: "trainer" | "gym_leader" | "elite_four" | "champion" | "professor";
          total_sales_volume?: number;
          total_purchases_volume?: number;
          total_transactions?: number;
          is_verified?: boolean;
          is_admin?: boolean;
          is_premium_member?: boolean;
          premium_expires_at?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          login_streak?: number;
          last_login_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          country_code?: string;
          preferred_language?: string;
          stripe_customer_id?: string | null;
          stripe_connect_account_id?: string | null;
          xp?: number;
          tier?: "trainer" | "gym_leader" | "elite_four" | "champion" | "professor";
          total_sales_volume?: number;
          total_purchases_volume?: number;
          total_transactions?: number;
          is_verified?: boolean;
          is_admin?: boolean;
          is_premium_member?: boolean;
          premium_expires_at?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          login_streak?: number;
          last_login_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          commission_rate: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          commission_rate: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          commission_rate?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      pokemon_sets: {
        Row: {
          id: string;
          external_id: string | null;
          name: string;
          series: string | null;
          release_date: string | null;
          total_cards: number | null;
          logo_url: string | null;
          symbol_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          external_id?: string | null;
          name: string;
          series?: string | null;
          release_date?: string | null;
          total_cards?: number | null;
          logo_url?: string | null;
          symbol_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          external_id?: string | null;
          name?: string;
          series?: string | null;
          release_date?: string | null;
          total_cards?: number | null;
          logo_url?: string | null;
          symbol_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pokemon_cards: {
        Row: {
          id: string;
          external_id: string | null;
          set_id: string | null;
          name: string;
          number: string | null;
          rarity: string | null;
          supertype: string | null;
          subtypes: string[] | null;
          hp: string | null;
          types: string[] | null;
          image_small: string | null;
          image_large: string | null;
          artist: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          external_id?: string | null;
          set_id?: string | null;
          name: string;
          number?: string | null;
          rarity?: string | null;
          supertype?: string | null;
          subtypes?: string[] | null;
          hp?: string | null;
          types?: string[] | null;
          image_small?: string | null;
          image_large?: string | null;
          artist?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          external_id?: string | null;
          set_id?: string | null;
          name?: string;
          number?: string | null;
          rarity?: string | null;
          supertype?: string | null;
          subtypes?: string[] | null;
          hp?: string | null;
          types?: string[] | null;
          image_small?: string | null;
          image_large?: string | null;
          artist?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pokemon_cards_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "pokemon_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      consignments: {
        Row: {
          id: string;
          consigner_id: string;
          status: "pending" | "shipped_to_us" | "received" | "processing" | "listed" | "sold" | "paid_out" | "returned" | "disputed";
          tracking_number_inbound: string | null;
          shipping_carrier_inbound: string | null;
          received_at: string | null;
          processed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          consigner_id: string;
          status?: "pending" | "shipped_to_us" | "received" | "processing" | "listed" | "sold" | "paid_out" | "returned" | "disputed";
          tracking_number_inbound?: string | null;
          shipping_carrier_inbound?: string | null;
          received_at?: string | null;
          processed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          consigner_id?: string;
          status?: "pending" | "shipped_to_us" | "received" | "processing" | "listed" | "sold" | "paid_out" | "returned" | "disputed";
          tracking_number_inbound?: string | null;
          shipping_carrier_inbound?: string | null;
          received_at?: string | null;
          processed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consignments_consigner_id_fkey";
            columns: ["consigner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          id: string;
          consignment_id: string;
          seller_id: string;
          category_id: string;
          pokemon_card_id: string | null;
          title: string;
          description: string | null;
          condition: "mint" | "near_mint" | "lightly_played" | "moderately_played" | "heavily_played" | "damaged" | null;
          language: string;
          grading_company: "psa" | "beckett" | "cgc" | null;
          grade: number | null;
          cert_number: string | null;
          listing_type: "auction" | "buy_now" | "auction_with_buy_now";
          starting_price: number | null;
          reserve_price: number | null;
          buy_now_price: number | null;
          current_bid: number;
          bid_count: number;
          auction_start: string | null;
          auction_end: string | null;
          auto_extend: boolean;
          auto_extend_minutes: number;
          status: "draft" | "active" | "ended" | "sold" | "unsold" | "cancelled";
          commission_rate: number | null;
          final_sale_price: number | null;
          commission_amount: number | null;
          seller_payout: number | null;
          offers_enabled: boolean;
          minimum_offer: number | null;
          view_count: number;
          favorite_count: number;
          featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          consignment_id: string;
          seller_id: string;
          category_id: string;
          pokemon_card_id?: string | null;
          title: string;
          description?: string | null;
          condition?: "mint" | "near_mint" | "lightly_played" | "moderately_played" | "heavily_played" | "damaged" | null;
          language?: string;
          grading_company?: "psa" | "beckett" | "cgc" | null;
          grade?: number | null;
          cert_number?: string | null;
          listing_type: "auction" | "buy_now" | "auction_with_buy_now";
          starting_price?: number | null;
          reserve_price?: number | null;
          buy_now_price?: number | null;
          current_bid?: number;
          bid_count?: number;
          auction_start?: string | null;
          auction_end?: string | null;
          auto_extend?: boolean;
          auto_extend_minutes?: number;
          status?: "draft" | "active" | "ended" | "sold" | "unsold" | "cancelled";
          commission_rate?: number | null;
          final_sale_price?: number | null;
          commission_amount?: number | null;
          seller_payout?: number | null;
          offers_enabled?: boolean;
          minimum_offer?: number | null;
          view_count?: number;
          favorite_count?: number;
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          consignment_id?: string;
          seller_id?: string;
          category_id?: string;
          pokemon_card_id?: string | null;
          title?: string;
          description?: string | null;
          condition?: "mint" | "near_mint" | "lightly_played" | "moderately_played" | "heavily_played" | "damaged" | null;
          language?: string;
          grading_company?: "psa" | "beckett" | "cgc" | null;
          grade?: number | null;
          cert_number?: string | null;
          listing_type?: "auction" | "buy_now" | "auction_with_buy_now";
          starting_price?: number | null;
          reserve_price?: number | null;
          buy_now_price?: number | null;
          current_bid?: number;
          bid_count?: number;
          auction_start?: string | null;
          auction_end?: string | null;
          auto_extend?: boolean;
          auto_extend_minutes?: number;
          status?: "draft" | "active" | "ended" | "sold" | "unsold" | "cancelled";
          commission_rate?: number | null;
          final_sale_price?: number | null;
          commission_amount?: number | null;
          seller_payout?: number | null;
          offers_enabled?: boolean;
          minimum_offer?: number | null;
          view_count?: number;
          favorite_count?: number;
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_pokemon_card_id_fkey";
            columns: ["pokemon_card_id"];
            isOneToOne: false;
            referencedRelation: "pokemon_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_consignment_id_fkey";
            columns: ["consignment_id"];
            isOneToOne: false;
            referencedRelation: "consignments";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          image_url: string;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          image_url: string;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          image_url?: string;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      bids: {
        Row: {
          id: string;
          listing_id: string;
          bidder_id: string;
          amount: number;
          max_bid: number;
          is_winning: boolean;
          is_auto_bid: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          bidder_id: string;
          amount: number;
          max_bid: number;
          is_winning?: boolean;
          is_auto_bid?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          bidder_id?: string;
          amount?: number;
          max_bid?: number;
          is_winning?: boolean;
          is_auto_bid?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bids_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bids_bidder_id_fkey";
            columns: ["bidder_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          amount: number;
          status: "pending" | "accepted" | "rejected" | "countered" | "expired" | "withdrawn";
          counter_amount: number | null;
          message: string | null;
          expires_at: string;
          responded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          amount: number;
          status?: "pending" | "accepted" | "rejected" | "countered" | "expired" | "withdrawn";
          counter_amount?: number | null;
          message?: string | null;
          expires_at?: string;
          responded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_id?: string;
          amount?: number;
          status?: "pending" | "accepted" | "rejected" | "countered" | "expired" | "withdrawn";
          counter_amount?: number | null;
          message?: string | null;
          expires_at?: string;
          responded_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          sale_price: number;
          buyer_premium: number;
          shipping_cost: number;
          total_amount: number;
          commission_amount: number;
          seller_payout: number;
          stripe_payment_intent_id: string | null;
          payment_status: "pending" | "processing" | "paid" | "failed" | "refunded";
          paid_at: string | null;
          shipping_address: Json | null;
          tracking_number: string | null;
          shipping_carrier: string | null;
          shipping_label_url: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          payout_status: "pending" | "processing" | "paid" | "failed";
          stripe_transfer_id: string | null;
          paid_out_at: string | null;
          status: "pending" | "paid" | "shipping" | "shipped" | "delivered" | "completed" | "disputed" | "refunded" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          sale_price: number;
          buyer_premium?: number;
          shipping_cost?: number;
          total_amount: number;
          commission_amount: number;
          seller_payout: number;
          stripe_payment_intent_id?: string | null;
          payment_status?: "pending" | "processing" | "paid" | "failed" | "refunded";
          paid_at?: string | null;
          shipping_address?: Json | null;
          tracking_number?: string | null;
          shipping_carrier?: string | null;
          shipping_label_url?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          payout_status?: "pending" | "processing" | "paid" | "failed";
          stripe_transfer_id?: string | null;
          paid_out_at?: string | null;
          status?: "pending" | "paid" | "shipping" | "shipped" | "delivered" | "completed" | "disputed" | "refunded" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          listing_id?: string;
          buyer_id?: string;
          seller_id?: string;
          sale_price?: number;
          buyer_premium?: number;
          shipping_cost?: number;
          total_amount?: number;
          commission_amount?: number;
          seller_payout?: number;
          stripe_payment_intent_id?: string | null;
          payment_status?: "pending" | "processing" | "paid" | "failed" | "refunded";
          paid_at?: string | null;
          shipping_address?: Json | null;
          tracking_number?: string | null;
          shipping_carrier?: string | null;
          shipping_label_url?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          payout_status?: "pending" | "processing" | "paid" | "failed";
          stripe_transfer_id?: string | null;
          paid_out_at?: string | null;
          status?: "pending" | "paid" | "shipping" | "shipped" | "delivered" | "completed" | "disputed" | "refunded" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          listing_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          listing_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Json | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Json | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Json | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon_url: string | null;
          category: string;
          xp_reward: number;
          requirement_type: string;
          requirement_value: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          icon_url?: string | null;
          category: string;
          xp_reward?: number;
          requirement_type: string;
          requirement_value?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          icon_url?: string | null;
          category?: string;
          xp_reward?: number;
          requirement_type?: string;
          requirement_value?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_badges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      xp_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          xp_amount: number;
          description: string | null;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          xp_amount: number;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          xp_amount?: number;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          title: string;
          description: string;
          challenge_type: string;
          requirement_type: string;
          requirement_value: number;
          xp_reward: number;
          badge_reward_id: string | null;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          challenge_type: string;
          requirement_type: string;
          requirement_value: number;
          xp_reward: number;
          badge_reward_id?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          challenge_type?: string;
          requirement_type?: string;
          requirement_value?: number;
          xp_reward?: number;
          badge_reward_id?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_challenges: {
        Row: {
          user_id: string;
          challenge_id: string;
          progress: number;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: {
          user_id: string;
          challenge_id: string;
          progress?: number;
          completed?: boolean;
          completed_at?: string | null;
        };
        Update: {
          user_id?: string;
          challenge_id?: string;
          progress?: number;
          completed?: boolean;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_challenges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      wheel_spins: {
        Row: {
          id: string;
          user_id: string;
          prize_type: string;
          prize_value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prize_type: string;
          prize_value: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prize_type?: string;
          prize_value?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      collection_items: {
        Row: {
          user_id: string;
          pokemon_card_id: string;
          status: "own" | "want" | "for_trade";
          quantity: number;
          condition: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          pokemon_card_id: string;
          status?: "own" | "want" | "for_trade";
          quantity?: number;
          condition?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          pokemon_card_id?: string;
          status?: "own" | "want" | "for_trade";
          quantity?: number;
          condition?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_items_pokemon_card_id_fkey";
            columns: ["pokemon_card_id"];
            isOneToOne: false;
            referencedRelation: "pokemon_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      price_history: {
        Row: {
          id: string;
          pokemon_card_id: string | null;
          condition: string | null;
          grading_company: string | null;
          grade: number | null;
          sale_price: number;
          source: string;
          sold_at: string;
        };
        Insert: {
          id?: string;
          pokemon_card_id?: string | null;
          condition?: string | null;
          grading_company?: string | null;
          grade?: number | null;
          sale_price: number;
          source?: string;
          sold_at?: string;
        };
        Update: {
          id?: string;
          pokemon_card_id?: string | null;
          condition?: string | null;
          grading_company?: string | null;
          grade?: number | null;
          sale_price?: number;
          source?: string;
          sold_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Convenience types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

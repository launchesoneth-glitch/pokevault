-- PokéVault Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  country_code TEXT NOT NULL,
  preferred_language TEXT DEFAULT 'en',
  stripe_customer_id TEXT,
  stripe_connect_account_id TEXT,
  xp INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'trainer' CHECK (tier IN ('trainer', 'gym_leader', 'elite_four', 'champion', 'professor')),
  total_sales_volume DECIMAL(12,2) DEFAULT 0,
  total_purchases_volume DECIMAL(12,2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  is_premium_member BOOLEAN DEFAULT false,
  premium_expires_at TIMESTAMPTZ,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id),
  login_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_xp ON users(xp DESC);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- ============================================
-- FOLLOWS
-- ============================================
CREATE TABLE follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  commission_rate DECIMAL(4,2) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ============================================
-- POKEMON SETS
-- ============================================
CREATE TABLE pokemon_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  series TEXT,
  release_date DATE,
  total_cards INTEGER,
  logo_url TEXT,
  symbol_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POKEMON CARDS
-- ============================================
CREATE TABLE pokemon_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  set_id UUID REFERENCES pokemon_sets(id),
  name TEXT NOT NULL,
  number TEXT,
  rarity TEXT,
  supertype TEXT,
  subtypes TEXT[],
  hp TEXT,
  types TEXT[],
  image_small TEXT,
  image_large TEXT,
  artist TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pokemon_cards_set ON pokemon_cards(set_id);
CREATE INDEX idx_pokemon_cards_name ON pokemon_cards(name);

-- ============================================
-- CONSIGNMENTS
-- ============================================
CREATE TABLE consignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consigner_id UUID REFERENCES users(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'shipped_to_us', 'received', 'processing',
    'listed', 'sold', 'paid_out', 'returned', 'disputed'
  )),
  tracking_number_inbound TEXT,
  shipping_carrier_inbound TEXT,
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consignments_consigner ON consignments(consigner_id);
CREATE INDEX idx_consignments_status ON consignments(status);

-- ============================================
-- LISTINGS
-- ============================================
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id UUID REFERENCES consignments(id) NOT NULL,
  seller_id UUID REFERENCES users(id) NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  pokemon_card_id UUID REFERENCES pokemon_cards(id),

  title TEXT NOT NULL,
  description TEXT,
  condition TEXT CHECK (condition IN ('mint', 'near_mint', 'lightly_played', 'moderately_played', 'heavily_played', 'damaged')),
  language TEXT DEFAULT 'en',
  grading_company TEXT CHECK (grading_company IN ('psa', 'beckett', 'cgc')),
  grade DECIMAL(3,1),
  cert_number TEXT,

  listing_type TEXT NOT NULL CHECK (listing_type IN ('auction', 'buy_now', 'auction_with_buy_now')),

  starting_price DECIMAL(10,2),
  reserve_price DECIMAL(10,2),
  buy_now_price DECIMAL(10,2),
  current_bid DECIMAL(10,2) DEFAULT 0,
  bid_count INTEGER DEFAULT 0,

  auction_start TIMESTAMPTZ,
  auction_end TIMESTAMPTZ,
  auto_extend BOOLEAN DEFAULT true,
  auto_extend_minutes INTEGER DEFAULT 2,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended', 'sold', 'unsold', 'cancelled')),

  commission_rate DECIMAL(4,2),
  final_sale_price DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  seller_payout DECIMAL(10,2),

  offers_enabled BOOLEAN DEFAULT false,
  minimum_offer DECIMAL(10,2),

  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_type ON listings(listing_type);
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_listings_pokemon_card ON listings(pokemon_card_id);
CREATE INDEX idx_listings_auction_end ON listings(auction_end);
CREATE INDEX idx_listings_featured ON listings(featured) WHERE featured = true;
CREATE INDEX idx_listings_active ON listings(status, listing_type, auction_end) WHERE status = 'active';

-- ============================================
-- LISTING IMAGES
-- ============================================
CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listing_images_listing ON listing_images(listing_id);

-- ============================================
-- BIDS
-- ============================================
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  bidder_id UUID REFERENCES users(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  max_bid DECIMAL(10,2) NOT NULL,
  is_winning BOOLEAN DEFAULT false,
  is_auto_bid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_listing ON bids(listing_id);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);
CREATE INDEX idx_bids_winning ON bids(listing_id, is_winning) WHERE is_winning = true;

-- ============================================
-- OFFERS
-- ============================================
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  buyer_id UUID REFERENCES users(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')),
  counter_amount DECIMAL(10,2),
  message TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_listing ON offers(listing_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_status ON offers(status);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  listing_id UUID REFERENCES listings(id) NOT NULL,
  buyer_id UUID REFERENCES users(id) NOT NULL,
  seller_id UUID REFERENCES users(id) NOT NULL,

  sale_price DECIMAL(10,2) NOT NULL,
  buyer_premium DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  seller_payout DECIMAL(10,2) NOT NULL,

  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,

  shipping_address JSONB,
  tracking_number TEXT,
  shipping_carrier TEXT,
  shipping_label_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
  stripe_transfer_id TEXT,
  paid_out_at TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipping', 'shipped', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_listing ON orders(listing_id);

-- ============================================
-- FAVORITES
-- ============================================
CREATE TABLE favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX idx_favorites_listing ON favorites(listing_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ============================================
-- BADGES
-- ============================================
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  category TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER BADGES
-- ============================================
CREATE TABLE user_badges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- ============================================
-- XP EVENTS
-- ============================================
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_events_user ON xp_events(user_id, created_at DESC);

-- ============================================
-- CHALLENGES
-- ============================================
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  badge_reward_id UUID REFERENCES badges(id),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER CHALLENGES
-- ============================================
CREATE TABLE user_challenges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, challenge_id)
);

-- ============================================
-- WHEEL SPINS
-- ============================================
CREATE TABLE wheel_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  prize_type TEXT NOT NULL,
  prize_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COLLECTION ITEMS
-- ============================================
CREATE TABLE collection_items (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pokemon_card_id UUID REFERENCES pokemon_cards(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'own' CHECK (status IN ('own', 'want', 'for_trade')),
  quantity INTEGER DEFAULT 1,
  condition TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, pokemon_card_id)
);

CREATE INDEX idx_collection_user ON collection_items(user_id);

-- ============================================
-- PRICE HISTORY
-- ============================================
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pokemon_card_id UUID REFERENCES pokemon_cards(id),
  condition TEXT,
  grading_company TEXT,
  grade DECIMAL(3,1),
  sale_price DECIMAL(10,2) NOT NULL,
  source TEXT DEFAULT 'platform',
  sold_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_card ON price_history(pokemon_card_id, sold_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Public read for listings, categories, sets, cards, badges
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users: anyone can read public profiles, users can update their own
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Follows: anyone can read, authenticated users can insert/delete their own
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Categories: public read
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- Pokemon sets & cards: public read
CREATE POLICY "Sets are viewable by everyone" ON pokemon_sets FOR SELECT USING (true);
CREATE POLICY "Cards are viewable by everyone" ON pokemon_cards FOR SELECT USING (true);

-- Consignments: users see their own, admins see all
CREATE POLICY "Users can view own consignments" ON consignments FOR SELECT USING (auth.uid() = consigner_id);
CREATE POLICY "Users can create consignments" ON consignments FOR INSERT WITH CHECK (auth.uid() = consigner_id);

-- Listings: public read for active, sellers can see their own drafts
CREATE POLICY "Active listings are viewable by everyone" ON listings FOR SELECT USING (status = 'active' OR seller_id = auth.uid());

-- Listing images: public read
CREATE POLICY "Listing images are viewable by everyone" ON listing_images FOR SELECT USING (true);

-- Bids: public read (amounts visible, bidder IDs handled in app layer)
CREATE POLICY "Bids are viewable by everyone" ON bids FOR SELECT USING (true);
CREATE POLICY "Authenticated users can bid" ON bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- Offers: participants can see their offers
CREATE POLICY "Users can view their offers" ON offers FOR SELECT USING (
  auth.uid() = buyer_id OR
  auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_id)
);
CREATE POLICY "Users can create offers" ON offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Sellers can respond to offers" ON offers FOR UPDATE USING (
  auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_id)
);

-- Orders: participants can see their orders
CREATE POLICY "Users can view their orders" ON orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Favorites: users see their own
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Notifications: users see their own
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Badges: public read
CREATE POLICY "Badges are viewable by everyone" ON badges FOR SELECT USING (true);

-- User badges: public read
CREATE POLICY "User badges are viewable by everyone" ON user_badges FOR SELECT USING (true);

-- XP events: users see their own
CREATE POLICY "Users can view own xp events" ON xp_events FOR SELECT USING (auth.uid() = user_id);

-- Challenges: public read
CREATE POLICY "Challenges are viewable by everyone" ON challenges FOR SELECT USING (true);

-- User challenges: users see their own
CREATE POLICY "Users can view own challenges" ON user_challenges FOR SELECT USING (auth.uid() = user_id);

-- Wheel spins: users see their own
CREATE POLICY "Users can view own spins" ON wheel_spins FOR SELECT USING (auth.uid() = user_id);

-- Collection: users manage their own
CREATE POLICY "Users can view own collection" ON collection_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to collection" ON collection_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update collection" ON collection_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove from collection" ON collection_items FOR DELETE USING (auth.uid() = user_id);

-- Price history: public read
CREATE POLICY "Price history viewable by everyone" ON price_history FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_consignments_updated_at BEFORE UPDATE ON consignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_collection_updated_at BEFORE UPDATE ON collection_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate unique referral code for new users
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code = UPPER(SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_referral_code BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Handle new auth user → create public profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, country_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'country_code', 'EU')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

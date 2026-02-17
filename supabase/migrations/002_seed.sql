-- Seed data for PokéVault

-- ============================================
-- CATEGORIES
-- ============================================
INSERT INTO categories (name, display_name, description, commission_rate, sort_order) VALUES
  ('raw_single', 'Raw Singles', 'Ungraded individual Pokémon cards', 15.00, 1),
  ('graded_card', 'Graded Cards', 'Professionally graded Pokémon cards (PSA, BGS, CGC)', 12.00, 2),
  ('sealed_product', 'Sealed Product', 'Factory sealed booster boxes, ETBs, and other products', 10.00, 3);

-- ============================================
-- BADGES
-- ============================================
INSERT INTO badges (slug, name, description, category, xp_reward, requirement_type, requirement_value, sort_order) VALUES
  ('kanto_pioneer', 'Kanto Pioneer', 'Submit your first consignment', 'selling', 50, 'consignment_count', 1, 1),
  ('shiny_hunter', 'Shiny Hunter', 'Sell an item worth €500+', 'selling', 200, 'sale_amount', 500, 2),
  ('pokedex_completer', 'Pokédex Completer', 'Complete a full set in your collection', 'collecting', 500, 'set_completion', 1, 3),
  ('day_care_master', 'Day Care Master', 'Refer 5 friends who make a purchase', 'social', 300, 'referral_count', 5, 4),
  ('breeder', 'Breeder', 'List 100+ items for sale', 'selling', 500, 'consignment_count', 100, 5),
  ('gym_badge_collector', 'Gym Badge Collector', 'Earn 8 different badges', 'milestone', 200, 'badge_count', 8, 6),
  ('legendary_encounter', 'Legendary Encounter', 'Win an auction over €1,000', 'buying', 500, 'sale_amount', 1000, 7),
  ('trade_evolution', 'Trade Evolution', 'Purchase from sellers in 5+ different countries', 'buying', 300, 'country_count', 5, 8),
  ('first_catch', 'First Catch', 'Make your first purchase', 'buying', 50, 'purchase_count', 1, 9),
  ('rival_battle', 'Rival Battle', 'Win your first auction', 'buying', 100, 'purchase_count', 1, 10),
  ('professors_assistant', 'Professor''s Assistant', 'Maintain a 30-day login streak', 'milestone', 500, 'login_streak', 30, 11),
  ('master_ball', 'Master Ball', 'Win 10 consecutive auctions', 'buying', 1000, 'manual', NULL, 12);

-- ============================================
-- INITIAL CHALLENGES
-- ============================================
INSERT INTO challenges (title, description, challenge_type, requirement_type, requirement_value, xp_reward, starts_at, ends_at) VALUES
  ('Bid Blitz', 'Place 10 bids this week', 'weekly', 'bid_count', 10, 100, NOW(), NOW() + INTERVAL '7 days'),
  ('Collector''s Start', 'Add 5 cards to your collection this week', 'weekly', 'favorite_count', 5, 75, NOW(), NOW() + INTERVAL '7 days'),
  ('Consignment Kickoff', 'Submit 3 consignments this month', 'monthly', 'consignment_count', 3, 200, NOW(), NOW() + INTERVAL '30 days'),
  ('Shopping Spree', 'Make 5 purchases this month', 'monthly', 'purchase_count', 5, 250, NOW(), NOW() + INTERVAL '30 days'),
  ('Streak Master', 'Log in for 7 consecutive days', 'one_time', 'login_streak', 7, 150, NULL, NULL);

-- Make consignment_id nullable (marketplace listings don't have consignments)
ALTER TABLE listings ALTER COLUMN consignment_id DROP NOT NULL;

-- Add marketplace columns
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_source TEXT NOT NULL DEFAULT 'consignment';

-- Update existing grading_company CHECK to allow new values (sgc, tag, other)
-- Drop old constraint if it exists, add flexible one
DO $$
BEGIN
  ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_grading_company_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Index for faster marketplace browsing
CREATE INDEX IF NOT EXISTS idx_listings_listing_source ON listings(listing_source);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);

-- RLS policy: allow authenticated users to insert their own marketplace listings
CREATE POLICY "Users can insert own marketplace listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seller_id
    AND listing_source = 'marketplace'
  );

-- RLS policy: allow users to update their own marketplace listings
CREATE POLICY "Users can update own marketplace listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id AND listing_source = 'marketplace')
  WITH CHECK (auth.uid() = seller_id AND listing_source = 'marketplace');

-- RLS policy: allow users to delete their own marketplace listings
CREATE POLICY "Users can delete own marketplace listings"
  ON listings FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id AND listing_source = 'marketplace');

-- Allow users to insert images for their own listings
CREATE POLICY "Users can insert images for own listings"
  ON listing_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.seller_id = auth.uid()
    )
  );

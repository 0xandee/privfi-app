-- Privfi Deposits Supabase Schema
-- Execute these commands in your Supabase SQL Editor

-- =========================================
-- 1. CREATE DEPOSITS TABLE
-- =========================================

CREATE TABLE public.deposits (
    id TEXT PRIMARY KEY,
    transaction_hash TEXT UNIQUE NOT NULL,
    wallet_address TEXT NOT NULL,
    token_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    secrets JSONB NOT NULL DEFAULT '[]',
    nullifiers JSONB NOT NULL DEFAULT '[]',
    pools JSONB NOT NULL DEFAULT '[]',
    timestamp BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'withdrawn')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_deposits_wallet_address ON public.deposits(wallet_address);
CREATE INDEX idx_deposits_status ON public.deposits(status);
CREATE INDEX idx_deposits_timestamp ON public.deposits(timestamp DESC);
CREATE INDEX idx_deposits_created_at ON public.deposits(created_at DESC);

-- =========================================
-- 2. DEPRECATED: TYPHOON DATA TABLE (NO LONGER NEEDED)
-- =========================================
--
-- NOTE: The typhoon_data table is no longer needed as Typhoon data (secrets, nullifiers, pools)
-- is now stored directly in the deposits table. This eliminates redundancy and simplifies the architecture.
--
-- If you have an existing typhoon_data table with data, you may want to migrate it to the deposits table
-- before dropping it. Uncomment the lines below if you need to recreate this table for migration purposes.
--
-- CREATE TABLE public.typhoon_data (
--     transaction_hash TEXT PRIMARY KEY,
--     secrets JSONB NOT NULL DEFAULT '[]',
--     nullifiers JSONB NOT NULL DEFAULT '[]',
--     pools JSONB NOT NULL DEFAULT '[]',
--     token_address TEXT NOT NULL,
--     amount TEXT NOT NULL,
--     timestamp BIGINT NOT NULL,
--     wallet_address TEXT NOT NULL,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- -- Indexes for Typhoon data
-- CREATE INDEX idx_typhoon_wallet_address ON public.typhoon_data(wallet_address);
-- CREATE INDEX idx_typhoon_timestamp ON public.typhoon_data(timestamp DESC);

-- =========================================
-- 3. CREATE WITHDRAWALS TABLE
-- =========================================

CREATE TABLE public.withdrawals (
    id TEXT PRIMARY KEY,
    deposit_id TEXT NOT NULL REFERENCES public.deposits(id),
    transaction_hash TEXT UNIQUE NOT NULL,
    wallet_address TEXT NOT NULL,
    token_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    recipient_addresses JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for withdrawals performance
CREATE INDEX idx_withdrawals_wallet_address ON public.withdrawals(wallet_address);
CREATE INDEX idx_withdrawals_deposit_id ON public.withdrawals(deposit_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX idx_withdrawals_timestamp ON public.withdrawals(timestamp DESC);
CREATE INDEX idx_withdrawals_created_at ON public.withdrawals(created_at DESC);

-- =========================================
-- 4. CREATE UPDATED_AT TRIGGERS
-- =========================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for deposits table
CREATE TRIGGER trigger_deposits_updated_at
    BEFORE UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for withdrawals table
CREATE TRIGGER trigger_withdrawals_updated_at
    BEFORE UPDATE ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =========================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =========================================

-- Enable RLS on deposits table
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.typhoon_data ENABLE ROW LEVEL SECURITY; -- DEPRECATED: typhoon_data table no longer used
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 6. CREATE RLS POLICIES
-- =========================================

-- Deposits table policies
-- Allow public read access (anonymous users can read all deposits)
CREATE POLICY "Allow public read access on deposits" ON public.deposits
    FOR SELECT USING (true);

-- Allow insert for any authenticated or anonymous user
-- Note: We'll validate wallet ownership in the application layer
CREATE POLICY "Allow public insert on deposits" ON public.deposits
    FOR INSERT WITH CHECK (true);

-- Allow update for any user (application layer will handle validation)
CREATE POLICY "Allow public update on deposits" ON public.deposits
    FOR UPDATE USING (true);

-- Allow delete for any user (application layer will handle validation)
CREATE POLICY "Allow public delete on deposits" ON public.deposits
    FOR DELETE USING (true);

-- DEPRECATED: Typhoon data table policies (table no longer used)
-- CREATE POLICY "Allow public read access on typhoon_data" ON public.typhoon_data
--     FOR SELECT USING (true);
--
-- CREATE POLICY "Allow public insert on typhoon_data" ON public.typhoon_data
--     FOR INSERT WITH CHECK (true);
--
-- CREATE POLICY "Allow public update on typhoon_data" ON public.typhoon_data
--     FOR UPDATE USING (true);
--
-- CREATE POLICY "Allow public delete on typhoon_data" ON public.typhoon_data
--     FOR DELETE USING (true);

-- Withdrawals table policies
CREATE POLICY "Allow public read access on withdrawals" ON public.withdrawals
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on withdrawals" ON public.withdrawals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on withdrawals" ON public.withdrawals
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on withdrawals" ON public.withdrawals
    FOR DELETE USING (true);

-- =========================================
-- 7. ENABLE REAL-TIME
-- =========================================

-- Enable real-time subscriptions for deposits table
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;

-- Enable real-time subscriptions for withdrawals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;

-- DEPRECATED: Real-time for typhoon_data no longer needed
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.typhoon_data;

-- =========================================
-- 8. GRANT PERMISSIONS
-- =========================================

-- Grant permissions for anonymous role
GRANT ALL ON public.deposits TO anon;
-- GRANT ALL ON public.typhoon_data TO anon; -- DEPRECATED: typhoon_data table no longer used
GRANT ALL ON public.withdrawals TO anon;

-- Grant permissions for authenticated role (if you plan to use auth later)
GRANT ALL ON public.deposits TO authenticated;
-- GRANT ALL ON public.typhoon_data TO authenticated; -- DEPRECATED: typhoon_data table no longer used
GRANT ALL ON public.withdrawals TO authenticated;

-- =========================================
-- 9. CREATE SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =========================================

-- Uncomment to insert sample data for testing
/*
INSERT INTO public.deposits (
    id,
    transaction_hash,
    wallet_address,
    token_address,
    amount,
    secrets,
    nullifiers,
    pools,
    timestamp,
    status,
    note
) VALUES (
    'deposit_test_001',
    '0x1234567890abcdef',
    '0x1234567890123456789012345678901234567890123456789012345678901234',
    '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    '1000000000000000000',
    '[]',
    '[]',
    '[]',
    1700000000000,
    'confirmed',
    'Test deposit of 1 ETH'
);
*/
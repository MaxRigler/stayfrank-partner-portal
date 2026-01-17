-- =====================================================
-- STAYFRANK PARTNER PORTAL - SUPABASE SCHEMA
-- =====================================================
-- Run this SQL in your new Supabase project's SQL Editor
-- Make sure to run these in order!
-- =====================================================

-- =====================================================
-- STEP 1: Create Enums
-- =====================================================

CREATE TYPE user_role AS ENUM ('manager', 'officer');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'denied');
CREATE TYPE app_role AS ENUM ('admin');

-- =====================================================
-- STEP 2: Create Tables
-- =====================================================

-- Profiles table (stores user data)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  cell_phone TEXT,
  company_name TEXT,
  company_url TEXT,
  role user_role DEFAULT 'manager',
  status user_status DEFAULT 'pending',
  parent_id UUID REFERENCES profiles(id),
  invite_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (for admin privileges)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Submissions table (stores lead data)
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Property Data (from ATTOM)
  property_address TEXT NOT NULL,
  home_value NUMERIC,
  mortgage_balance NUMERIC,
  owner_names TEXT[],
  property_type TEXT,
  state TEXT,
  
  -- Personal Details (from Step 2)
  owner_emails TEXT[],
  owner_phones TEXT[],
  owner_credit_scores TEXT[],
  mortgage_current BOOLEAN,
  money_reason TEXT,
  money_amount TEXT,
  
  -- Sale-Leaseback Qualification
  sl_eligible BOOLEAN DEFAULT false,
  sl_offer_amount NUMERIC,
  sl_ineligibility_reasons TEXT[],
  
  -- HEI Qualification  
  hei_eligible BOOLEAN DEFAULT false,
  hei_max_investment NUMERIC,
  hei_ineligibility_reasons TEXT[],
  
  -- Cross-system tracking (links to EquityAdvance)
  equityadvance_deal_id UUID,
  everflow_tracking_link TEXT,
  
  -- CRM Integration (future HubSpot integration)
  submitted_to_crm BOOLEAN DEFAULT false,
  submitted_to_crm_at TIMESTAMPTZ,
  hubspot_contact_id TEXT,
  hubspot_deal_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- STEP 3: Create Functions
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1 AND user_roles.role = $2
  );
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_token_param UUID;
  parent_manager_id UUID;
BEGIN
  -- Extract invite token from metadata if present
  invite_token_param := (NEW.raw_user_meta_data->>'invite_token')::UUID;
  
  IF invite_token_param IS NOT NULL THEN
    -- Find parent manager by invite token
    SELECT id INTO parent_manager_id
    FROM profiles
    WHERE invite_token = invite_token_param AND role = 'manager';
    
    IF parent_manager_id IS NOT NULL THEN
      -- Create as officer under that manager
      INSERT INTO profiles (id, email, full_name, cell_phone, company_name, role, status, parent_id)
      VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'cell_phone',
        NEW.raw_user_meta_data->>'company_name',
        'officer',
        'pending',
        parent_manager_id
      );
      RETURN NEW;
    END IF;
  END IF;
  
  -- Default: create as manager
  INSERT INTO profiles (id, email, full_name, cell_phone, company_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'cell_phone',
    NEW.raw_user_meta_data->>'company_name',
    'manager',
    'pending'
  );
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 4: Create Triggers
-- =====================================================

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger to update timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 5: Enable Row Level Security
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: Create RLS Policies
-- =====================================================

-- PROFILES POLICIES

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Managers can view their officers
CREATE POLICY "Managers can view their officers"
  ON profiles FOR SELECT
  USING (parent_id = auth.uid());

-- Managers can update their officers
CREATE POLICY "Managers can update their officers"
  ON profiles FOR UPDATE
  USING (parent_id = auth.uid());

-- SUBMISSIONS POLICIES

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
  ON submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Managers can view their officers' submissions
CREATE POLICY "Managers can view officer submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = submissions.user_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update all submissions
CREATE POLICY "Admins can update all submissions"
  ON submissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- USER ROLES POLICIES

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- STEP 7: Seed Admin Users
-- =====================================================
-- IMPORTANT: Run this AFTER derek@stayfrank.com and 
-- max@equityadvance.com have created accounts!
-- Replace the UUIDs with actual user IDs from auth.users
-- =====================================================

-- To find user IDs, run this query after they've signed up:
-- SELECT id, email FROM auth.users WHERE email IN ('derek@stayfrank.com', 'max@equityadvance.com');

-- Then run (replacing with actual UUIDs):
-- INSERT INTO user_roles (user_id, role) VALUES
--   ('DEREK_USER_ID_HERE', 'admin'),
--   ('MAX_USER_ID_HERE', 'admin');

-- Also set their profile status to 'active':
-- UPDATE profiles SET status = 'active' WHERE id IN ('DEREK_USER_ID_HERE', 'MAX_USER_ID_HERE');

-- =====================================================
-- DONE!
-- =====================================================

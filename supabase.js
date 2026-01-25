import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://kcybawwvsfucdpdcdvpk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjeWJhd3d2c2Z1Y2RwZGNkdnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzQ4MjIsImV4cCI6MjA4MTQxMDgyMn0.PIDmd8vqoEikZNvklfznNNFKjS98yBbu_OC7bf0UoqY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual Supabase Project URL and Anon Key
// You can find these in your Supabase project's "Settings" > "API" section
const supabaseUrl = 'https://mytexuyqwuoyncdlaflq.supabase.co'; // e.g., 'https://xyz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dGV4dXlxd3VveW5jZGxhZmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzUwMzMsImV4cCI6MjA3NjY1MTAzM30.UNTUre4McX_E5Pxtbxq3NMjiFaoXujkdbzTmOQV64M8'; // This is the public key, it's safe to use in the browser

// FIX: Removed the check for placeholder credentials. This was causing a TypeScript
// compile error because the credentials are now hardcoded as constants, making
// the comparison with placeholder strings always false and thus unintentional.
// The check is no longer necessary.

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

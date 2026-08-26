import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

const client = createClient(supabaseUrl, supabaseKey);

// Keep email-confirmation links in the environment where signup started.
// Staging signups return to staging; production signups return to production.
const originalSignUp = client.auth.signUp.bind(client.auth);
client.auth.signUp = (credentials) => originalSignUp({
  ...credentials,
  options: {
    ...credentials.options,
    emailRedirectTo: credentials.options?.emailRedirectTo || window.location.origin,
  },
});

export const supabase = client;

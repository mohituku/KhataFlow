import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

class SupabaseService {
  private static instance: SupabaseService;
  public client: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials not found. Using placeholder mode.');
      // Create a placeholder client (will fail on actual calls)
      this.client = createClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      );
    } else {
      this.client = createClient(supabaseUrl, supabaseKey);
    }
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }
}

export const supabase = SupabaseService.getInstance().client;

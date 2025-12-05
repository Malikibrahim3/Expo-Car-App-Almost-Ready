/**
 * API Authentication Utilities
 * Provides JWT verification for API endpoints
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Server-side Supabase client (uses service role key)
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !serviceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    supabaseAdmin = createClient(url, serviceKey);
  }
  return supabaseAdmin;
}

export interface AuthResult {
  user: User | null;
  error: string | null;
}

/**
 * Verify JWT token from Authorization header
 * Returns the authenticated user or an error
 */
export async function verifyAuthToken(authHeader: string | undefined): Promise<AuthResult> {
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Invalid authorization format. Use: Bearer <token>' };
  }
  
  const token = authHeader.substring(7);
  
  if (!token || token.length < 10) {
    return { user: null, error: 'Invalid token' };
  }
  
  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: 'Invalid or expired token' };
    }
    
    return { user, error: null };
  } catch (err) {
    console.error('Token verification error:', err);
    return { user: null, error: 'Token verification failed' };
  }
}

/**
 * Extract user ID from verified token
 * Use this instead of trusting userId from request body
 */
export async function getAuthenticatedUserId(authHeader: string | undefined): Promise<{ userId: string | null; error: string | null }> {
  const { user, error } = await verifyAuthToken(authHeader);
  
  if (error || !user) {
    return { userId: null, error: error || 'Authentication failed' };
  }
  
  return { userId: user.id, error: null };
}

export default {
  verifyAuthToken,
  getAuthenticatedUserId,
};

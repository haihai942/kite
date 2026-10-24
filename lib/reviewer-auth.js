/**
 * Check if current user is a reviewer
 * Only user with UUID "7ef3e962-5de4-406d-a630-2ada73486f62" is reviewer
 */
export async function isUserReviewer(supabase, user) {
  if (!user || !supabase) return false;
  
  // Only allow user with specific UUID to be reviewer
  if (user.id === "7ef3e962-5de4-406d-a630-2ada73486f62") {
    return true;
  }
  
  return false;
}
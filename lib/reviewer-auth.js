/**
 * Check if current user is a reviewer
 * Checks the reviewers table in the database
 */
export async function isUserReviewer(supabase, user) {
  if (!user || !supabase) return false;
  
  try {
    // Query the reviewers table to check if the user is a reviewer
    const { data, error } = await supabase
      .from('reviewers')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle to return null instead of throwing error
    
    if (error) {
      console.error('Error checking reviewer status:', error);
      return false;
    }
    
    // If we found a record, user is a reviewer
    return data !== null;
  } catch (err) {
    console.error('Exception checking reviewer status:', err);
    return false;
  }
}
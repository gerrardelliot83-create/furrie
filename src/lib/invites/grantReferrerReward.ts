/**
 * Grant the referrer a free consultation after their invitee completes
 * their first consultation. Called as a post-close side effect.
 *
 * Idempotent: checks `referrer_rewarded_at IS NULL` before granting.
 * If the invitee has never redeemed an invite (not an invitee), this
 * is a no-op. If the referrer already received the reward, also no-op.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/createNotification';
import { sendInviteRewardEmail } from '@/lib/email';

export async function grantReferrerRewardIfEligible(
  inviteeUserId: string
): Promise<void> {
  try {
    // Was this user an invitee? Find the invite they redeemed.
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('invite_codes')
      .select('id, referrer_id, referrer_rewarded_at')
      .eq('redeemed_by_id', inviteeUserId)
      .eq('status', 'redeemed')
      .maybeSingle();

    if (inviteErr || !invite) return; // not an invitee, or lookup failed

    // Already rewarded?
    if (invite.referrer_rewarded_at) return;

    // Is this the invitee's FIRST completed consultation?
    const { count, error: countErr } = await supabaseAdmin
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', inviteeUserId)
      .eq('status', 'closed')
      .eq('outcome', 'success');

    if (countErr || !count || count < 1) return;
    // We only want to reward on the first completion, which is when count=1
    // (the consultation that just closed). If count > 1 the referrer should
    // have already been rewarded — but we check referrer_rewarded_at above.
    if (count > 1) return;

    // Create a 1-credit pack for the referrer
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    const { data: pack, error: packErr } = await supabaseAdmin
      .from('consultation_packs')
      .insert({
        customer_id: invite.referrer_id,
        pack_size: 1,
        total_consultations: 1,
        unit_price: 0,
        discount_percent: 100,
        total_price: 0,
        status: 'active',
        source: 'invite_reward',
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (packErr || !pack) {
      console.error('Failed to create referrer reward pack:', packErr);
      return;
    }

    // Mark the invite as rewarded
    await supabaseAdmin
      .from('invite_codes')
      .update({
        referrer_rewarded_at: new Date().toISOString(),
        referrer_reward_pack_id: pack.id,
      })
      .eq('id', invite.id)
      .is('referrer_rewarded_at', null); // idempotent guard

    // Notify the referrer (in-app + email)
    try {
      const { data: referrerProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', invite.referrer_id)
        .single();

      await createNotification({
        user_id: invite.referrer_id,
        type: 'invite_reward',
        title: 'You earned a free consultation!',
        body: `Your invited friend completed their first consultation. 1 free consultation has been added to your account.`,
        channel: 'in_app',
        data: { packId: pack.id, source: 'invite_reward' },
      });

      // Send reward email
      if (referrerProfile?.email) {
        sendInviteRewardEmail({
          referrerEmail: referrerProfile.email,
          referrerName: referrerProfile.full_name || 'there',
        }).catch((emailErr) => {
          console.error('[EMAIL] Failed to send referrer reward email:', emailErr);
        });
      }
    } catch (notifyErr) {
      console.error('Referrer reward notification failed:', notifyErr);
    }
  } catch (err) {
    // Best-effort — never fail the main consultation-close flow
    console.error('grantReferrerRewardIfEligible error:', err);
  }
}

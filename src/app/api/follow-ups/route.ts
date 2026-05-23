import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import {
  mapConsultationWithRelationsFromDB,
  type ConsultationWithRelations,
} from '@/lib/utils/consultationMapper';

type FollowUpStatus = 'active' | 'expired' | 'all';

type FollowUpMessageRow = {
  id: string;
  content: string;
  sender_role: string;
  created_at: string;
};

type FollowUpThreadRow = {
  id: string;
  consultation_id: string;
  is_active: boolean | null;
  expires_at: string | null;
  created_at: string | null;
  consultations: Parameters<typeof mapConsultationWithRelationsFromDB>[0] | null;
  follow_up_messages: FollowUpMessageRow[] | null;
};

interface FollowUpItem {
  threadId: string;
  consultationId: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  consultation: ConsultationWithRelations;
  lastMessage: {
    content: string;
    senderRole: 'customer' | 'vet';
    createdAt: string;
  } | null;
  unreadCount: number;
}

export async function GET(request: Request) {
  try {
    const { user, error: authError, supabase } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = (searchParams.get('status') || 'active').toLowerCase() as FollowUpStatus;

    if (!['active', 'expired', 'all'].includes(statusParam)) {
      return NextResponse.json(
        { error: 'Invalid status. Allowed: active, expired, all', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('follow_up_threads')
      .select(`
        id,
        consultation_id,
        is_active,
        expires_at,
        created_at,
        consultations!follow_up_threads_consultation_id_fkey (
          *,
          pets!consultations_pet_id_fkey (
            id, name, species, breed, photo_urls
          ),
          profiles!consultations_vet_id_fkey (
            id, full_name, avatar_url
          )
        ),
        follow_up_messages (
          id, content, sender_role, created_at
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (statusParam === 'active') {
      query = query.eq('is_active', true);
    } else if (statusParam === 'expired') {
      query = query.eq('is_active', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching follow-up threads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch follow-ups', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    const threads = (data || []) as unknown as FollowUpThreadRow[];

    const followUps: FollowUpItem[] = threads
      .filter((thread) => thread.consultations)
      .map((thread) => {
        const consultation = mapConsultationWithRelationsFromDB(
          thread.consultations as Parameters<typeof mapConsultationWithRelationsFromDB>[0]
        );

        const messages = thread.follow_up_messages ?? [];
        const sorted = [...messages].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const lastMsgRow = sorted[0] ?? null;
        const lastMessage = lastMsgRow
          ? {
              content: lastMsgRow.content,
              senderRole: lastMsgRow.sender_role as 'customer' | 'vet',
              createdAt: lastMsgRow.created_at,
            }
          : null;

        // Approximate unread: vet messages newer than the customer's most recent message
        const customerLastIdx = sorted.findIndex((m) => m.sender_role === 'customer');
        const customerLastTime =
          customerLastIdx >= 0 ? new Date(sorted[customerLastIdx].created_at).getTime() : 0;
        const unreadCount = sorted.filter(
          (m) => m.sender_role === 'vet' && new Date(m.created_at).getTime() > customerLastTime
        ).length;

        return {
          threadId: thread.id,
          consultationId: thread.consultation_id,
          isActive: thread.is_active ?? false,
          expiresAt: thread.expires_at,
          createdAt: thread.created_at ?? '',
          consultation,
          lastMessage,
          unreadCount,
        };
      });

    return NextResponse.json({ followUps });
  } catch (error) {
    console.error('Unexpected error in GET /api/follow-ups:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

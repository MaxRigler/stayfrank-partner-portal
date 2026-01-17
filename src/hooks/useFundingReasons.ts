import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type FundingReason = Database['public']['Tables']['funding_reasons']['Row'];

interface UseFundingReasonsReturn {
    reasons: FundingReason[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

// Cache for funding reasons to avoid repeated fetches
let cachedReasons: FundingReason[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useFundingReasons(): UseFundingReasonsReturn {
    const [reasons, setReasons] = useState<FundingReason[]>(cachedReasons || []);
    const [loading, setLoading] = useState(!cachedReasons);
    const [error, setError] = useState<string | null>(null);

    const fetchReasons = useCallback(async () => {
        const now = Date.now();

        // Use cache if valid
        if (cachedReasons && (now - cacheTimestamp) < CACHE_DURATION) {
            setReasons(cachedReasons);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Get auth token from localStorage
            const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
            const storedData = localStorage.getItem(storageKey);
            let accessToken = '';

            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData);
                    accessToken = parsed?.access_token || '';
                } catch {
                    console.warn('useFundingReasons: Could not parse auth token');
                }
            }

            // Use REST API to avoid Supabase client issues
            const response = await fetch(
                'https://ximkveundgebbvbgacfu.supabase.co/rest/v1/funding_reasons?is_active=eq.true&order=display_order.asc',
                {
                    method: 'GET',
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ',
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data: FundingReason[] = await response.json();

            // Update cache
            cachedReasons = data;
            cacheTimestamp = now;

            setReasons(data);
        } catch (err: any) {
            console.error('useFundingReasons: Error fetching reasons:', err);
            setError(err.message || 'Failed to load funding reasons');

            // Fall back to hardcoded defaults if fetch fails
            const defaults: FundingReason[] = [
                { id: '1', value: 'paying_off_debt', label: 'Paying Off Debt', display_order: 1, is_active: true, created_at: '', updated_at: '' },
                { id: '2', value: 'health_issues', label: 'Health Issues', display_order: 2, is_active: true, created_at: '', updated_at: '' },
                { id: '3', value: 'unemployed', label: 'Unemployed', display_order: 3, is_active: true, created_at: '', updated_at: '' },
                { id: '4', value: 'life_events', label: 'Life Events', display_order: 4, is_active: true, created_at: '', updated_at: '' },
                { id: '5', value: 'other', label: 'Other', display_order: 5, is_active: true, created_at: '', updated_at: '' },
            ];
            setReasons(defaults);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReasons();
    }, [fetchReasons]);

    const refetch = useCallback(async () => {
        // Clear cache to force refetch
        cachedReasons = null;
        cacheTimestamp = 0;
        await fetchReasons();
    }, [fetchReasons]);

    return { reasons, loading, error, refetch };
}

// Export for cache invalidation from admin
export function invalidateFundingReasonsCache() {
    cachedReasons = null;
    cacheTimestamp = 0;
}

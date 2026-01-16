// Hardcoded Supabase values (same as client.ts)
const SUPABASE_URL = "https://ximkveundgebbvbgacfu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ";

export interface AtomPropertyData {
    ownerNames: string;
    state: string;
    propertyType: string;
    estimatedValue: number;
    estimatedMortgageBalance: number;
}

export async function lookupProperty(address: string): Promise<AtomPropertyData> {
    console.log('lookupProperty called with address:', address);

    // Use direct fetch to Edge Function - no auth required for property lookup
    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/atom-property-lookup`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ address }),
        }
    );

    console.log('Edge Function response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Atom API error:', response.status, errorText);
        throw new Error(`Failed to lookup property: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Edge Function returned data:', data);

    if (data.error) {
        console.error('Atom API returned error:', data.error);
        throw new Error(data.error);
    }

    return {
        ownerNames: data.ownerNames || 'Unknown Owner',
        state: data.state || '',
        propertyType: mapPropertyType(data.propertyType),
        estimatedValue: data.estimatedValue || 0,
        estimatedMortgageBalance: data.estimatedMortgageBalance || 0
    };
}

/**
 * Maps Atom property types to our dropdown options
 */
function mapPropertyType(atomType: string): string {
    if (!atomType) return 'Single Family';

    // Atom "propclass" or similar usually returns these
    // Normalize to handle case variations
    const type = atomType.trim();
    const upperType = type.toUpperCase();

    const typeMap: Record<string, string> = {
        'Single Family Residence': 'Single Family',
        'Single Family': 'Single Family',
        'TIMESH': 'Condo', // Timeshare -> Condo? Or filter out?
        'Condominium': 'Condo',
        'Condo': 'Condo',
        'Townhouse': 'Townhouse',
        'Town House': 'Townhouse',
        'Multi-Family': 'Multi-Family',
        'Multifamily': 'Multi-Family',
        'Duplex': 'Multi-Family',
        'Triplex': 'Multi-Family',
        'Fourplex': 'Multi-Family',
        'Apartment': 'Apartment',
        'Mobile Home': 'Manufactured',
        'Manufactured': 'Manufactured',
        'Land': 'Land',
        'Vacant Land': 'Land',
        'Residential': 'Single Family', // Generic fallback
        'SFR': 'Single Family',
    };

    // return typeMap[atomType] || atomType || 'Single Family';
    // Case insensitive check
    for (const key in typeMap) {
        if (key.toUpperCase() === upperType) {
            return typeMap[key];
        }
    }

    // Fallback logic
    // Priority matters here: "Single Family Residence / Townhouse" should map to Single Family
    if (upperType.includes('FAMILY') || upperType.includes('SFR') || upperType.includes('RESIDENTIAL')) return 'Single Family';
    if (upperType.includes('CONDO')) return 'Condo';
    if (upperType.includes('TOWNHOUSE')) return 'Townhouse';
    if (upperType.includes('MULTI')) return 'Multi-Family';
    if (upperType.includes('LAND')) return 'Land';

    return 'Single Family';
}


/**
 * Detects ownership type from owner names by looking for business entity patterns
 * (Reused from previous logic as owner names strings are similar)
 */
export function detectOwnershipType(ownerNames: string): string {
    const upperNames = ownerNames.toUpperCase();

    // Check for LLC
    if (upperNames.includes('LLC') || upperNames.includes('L.L.C.') || upperNames.includes('LIMITED LIABILITY')) {
        return 'LLC';
    }

    // Check for Trust
    if (upperNames.includes('TRUST') || upperNames.includes('TRUSTEE') || upperNames.includes('TR ') || upperNames.includes(' TR')) {
        return 'Trust';
    }

    // Check for Corporation
    if (
        upperNames.includes('INC') ||
        upperNames.includes('CORP') ||
        upperNames.includes('INCORPORATED') ||
        upperNames.includes('CORPORATION') ||
        upperNames.includes(' CO.') ||
        upperNames.includes(' CO,')
    ) {
        return 'Corporation';
    }

    // Check for Partnership
    if (
        upperNames.includes('LP') ||
        upperNames.includes('L.P.') ||
        upperNames.includes('LIMITED PARTNERSHIP') ||
        upperNames.includes('LLP') ||
        upperNames.includes('L.L.P.') ||
        upperNames.includes('PARTNERSHIP')
    ) {
        return 'Partnership';
    }

    // Default to Personal for individuals
    return 'Personal';
}

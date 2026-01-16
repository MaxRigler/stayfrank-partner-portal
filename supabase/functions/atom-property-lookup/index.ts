// StayFrank Supabase Edge Function: atom-property-lookup
// This function looks up property data from ATTOM API
// Uses 3 endpoints like EquityAdvance: property profile, AVM, and mortgage history

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AtomResponse {
    ownerNames: string;
    state: string;
    propertyType: string;
    estimatedValue: number;
    estimatedMortgageBalance: number;
    rawPropertyData?: any;
    rawAvmData?: any;
    rawMortgageHistory?: any;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { address } = await req.json();

        if (!address) {
            return new Response(
                JSON.stringify({ error: "Address is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get ATTOM API key from environment
        const attomApiKey = Deno.env.get("ATTOM_API_KEY");

        if (!attomApiKey) {
            console.error("Missing ATTOM_API_KEY");
            return new Response(
                JSON.stringify({ error: "Server configuration error - missing API key" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log("Looking up property:", address);

        const encodedAddress = encodeURIComponent(address);
        const headers = {
            "Accept": "application/json",
            "apikey": attomApiKey,
        };

        // ============================================
        // STEP 1: Fetch Property Profile (basic data)
        // ============================================
        console.log("Fetching property data from Atom...");
        const propertyUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile?address=${encodedAddress}`;

        const propertyResponse = await fetch(propertyUrl, { method: "GET", headers });

        if (!propertyResponse.ok) {
            const errorText = await propertyResponse.text();
            console.error("ATTOM Property API error:", propertyResponse.status, errorText);
            return new Response(
                JSON.stringify({ error: `Failed to lookup property: ${propertyResponse.status}` }),
                { status: propertyResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const propertyData = await propertyResponse.json();
        console.log("Property data received");

        // Extract property from response
        const property = propertyData?.property?.[0];

        if (!property) {
            console.log("No property found in response");
            return new Response(
                JSON.stringify({ error: "Property not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ============================================
        // STEP 2: Fetch AVM Data (property valuation)
        // ============================================
        console.log("Fetching AVM data from Atom...");
        const avmUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/attomavm/detail?address=${encodedAddress}`;

        let avmData = null;
        let avmValue = 0;

        try {
            const avmResponse = await fetch(avmUrl, { method: "GET", headers });

            if (avmResponse.ok) {
                avmData = await avmResponse.json();
                console.log("AVM data received");

                // Extract AVM value from response
                const avmProperty = avmData?.property?.[0];
                if (avmProperty?.avm?.amount?.value) {
                    avmValue = avmProperty.avm.amount.value;
                    console.log("AVM value found:", avmValue);
                }
            } else {
                console.log("AVM endpoint returned:", avmResponse.status);
            }
        } catch (avmError) {
            console.error("AVM fetch error:", avmError);
        }

        // ============================================
        // STEP 3: Fetch Mortgage History (fallback)
        // ============================================
        console.log("Fetching Mortgage History from Atom (fallback)...");
        const mortgageUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile?address=${encodedAddress}`;

        let mortgageData = null;
        let mortgageRecords: any[] = [];

        try {
            const mortgageResponse = await fetch(mortgageUrl, { method: "GET", headers });

            if (mortgageResponse.ok) {
                mortgageData = await mortgageResponse.json();
                mortgageRecords = mortgageData?.property || [];
                console.log(`Found ${mortgageRecords.length} mortgage records`);
            } else {
                console.log("Mortgage endpoint returned:", mortgageResponse.status);
            }
        } catch (mortgageError) {
            console.error("Mortgage fetch error:", mortgageError);
        }

        // ============================================
        // Parse and combine data from all endpoints
        // ============================================

        // Parse owner names from AVM data first (more complete), then property data
        let ownerNames = "Unknown Owner";
        const avmProperty = avmData?.property?.[0];

        // Try AVM data first for owner
        if (avmProperty?.owner?.owner1?.fullname) {
            const owner1 = avmProperty.owner.owner1.fullname || "";
            const owner2 = avmProperty.owner?.owner2?.fullname || "";
            ownerNames = [owner1, owner2].filter(Boolean).join(", ") || "Unknown Owner";
        }
        // Fallback to property data
        else if (property.assessment?.owner) {
            const owner = property.assessment.owner;
            const owner1 = owner.owner1?.fullName || owner.owner1?.lastNameAndSuffix || "";
            const owner2 = owner.owner2?.fullName || owner.owner2?.lastNameAndSuffix || "";
            ownerNames = [owner1, owner2].filter(Boolean).join(", ") || "Unknown Owner";
        }

        // Get state from address
        const state = avmProperty?.address?.countrySubd || property.address?.countrySubd || "";

        // Get property type
        const propertyType = avmProperty?.summary?.propertyType || property.summary?.propertyType || "Single Family";

        // ============================================
        // Determine Estimated Value (priority order)
        // ============================================
        let estimatedValue = 0;

        // Priority 1: AVM value (most accurate current market estimate)
        if (avmValue > 0) {
            estimatedValue = avmValue;
            console.log("Using AVM value:", estimatedValue);
        }
        // Priority 2: Assessment market value
        else if (avmProperty?.assessment?.market?.mktttlvalue) {
            estimatedValue = avmProperty.assessment.market.mktttlvalue;
            console.log("Using AVM assessment market value:", estimatedValue);
        }
        else if (property.assessment?.market?.mktTtlValue) {
            estimatedValue = property.assessment.market.mktTtlValue;
            console.log("Using property assessment market value:", estimatedValue);
        }
        // Priority 3: Assessment assessed value
        else if (property.assessment?.assessed?.assdTtlValue) {
            estimatedValue = property.assessment.assessed.assdTtlValue;
            console.log("Using assessed value:", estimatedValue);
        }
        // Priority 4: Recent sale price
        else if (avmProperty?.sale?.amount?.saleAmt) {
            estimatedValue = avmProperty.sale.amount.saleAmt;
            console.log("Using sale amount:", estimatedValue);
        }

        // ============================================
        // Determine Mortgage Balance
        // ============================================
        let estimatedMortgageBalance = 0;

        // Try AVM data first
        if (avmProperty?.sale?.mortgage?.FirstConcurrent?.amount) {
            estimatedMortgageBalance = avmProperty.sale.mortgage.FirstConcurrent.amount;
        }
        // Try mortgage history
        else if (mortgageRecords.length > 0) {
            const latestMortgage = mortgageRecords[0];
            if (latestMortgage?.mortgage?.amount) {
                estimatedMortgageBalance = latestMortgage.mortgage.amount;
            }
        }
        // Try property data
        else if (property.mortgage?.FirstConcurrent?.amount) {
            estimatedMortgageBalance = property.mortgage.FirstConcurrent.amount;
        }
        else if (property.mortgage?.amount) {
            estimatedMortgageBalance = property.mortgage.amount;
        }

        const result: AtomResponse = {
            ownerNames,
            state,
            propertyType,
            estimatedValue: Math.round(estimatedValue),
            estimatedMortgageBalance: Math.round(estimatedMortgageBalance),
            rawPropertyData: propertyData,
            rawAvmData: avmData,
            rawMortgageHistory: mortgageData,
        };

        console.log("Returning result:", JSON.stringify(result));

        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error in atom-property-lookup:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

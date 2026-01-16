// StayFrank Supabase Edge Function: atom-property-lookup
// This function looks up property data from ATTOM API

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

        // Call ATTOM Property API - Address lookup
        const encodedAddress = encodeURIComponent(address);
        const attomUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile?address=${encodedAddress}`;

        const response = await fetch(attomUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "apikey": attomApiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("ATTOM API error:", response.status, errorText);
            return new Response(
                JSON.stringify({ error: `Failed to lookup property: ${response.status}` }),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const data = await response.json();
        console.log("ATTOM response received");

        // Extract property data from ATTOM response
        const property = data?.property?.[0];

        if (!property) {
            console.log("No property found in response:", JSON.stringify(data, null, 2));
            return new Response(
                JSON.stringify({ error: "Property not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Log available data paths for debugging
        console.log("Property keys:", Object.keys(property));
        console.log("AVM data:", JSON.stringify(property.avm, null, 2));
        console.log("Assessment data:", JSON.stringify(property.assessment, null, 2));
        console.log("Sale data:", JSON.stringify(property.sale, null, 2));

        // Parse owner names - check multiple paths
        let ownerNames = "Unknown Owner";
        const owner = property.assessment?.owner;
        if (owner) {
            const owner1 = owner.owner1?.fullName || owner.owner1?.lastNameAndSuffix || "";
            const owner2 = owner.owner2?.fullName || owner.owner2?.lastNameAndSuffix || "";
            ownerNames = [owner1, owner2].filter(Boolean).join(", ") || "Unknown Owner";
        }

        // Get state from address
        const state = property.address?.countrySubd || "";

        // Get property type
        const propertyType = property.summary?.propertyType || "Single Family";

        // Get estimated value - try multiple paths
        let estimatedValue =
            // AVM (Automated Valuation Model)
            property.avm?.amount?.value ||
            property.avm?.avmValue ||
            // Assessment values
            property.assessment?.market?.mktTotalValue ||
            property.assessment?.assessed?.assdTotalValue ||
            // Sale history
            property.sale?.saleTransactionDate?.salesPrice ||
            property.sale?.amount?.saleamt ||
            // Building value + land value
            (property.assessment?.assessed?.assdImprValue || 0) + (property.assessment?.assessed?.assdLandValue || 0) ||
            0;

        console.log("Extracted estimatedValue:", estimatedValue);

        // Estimate mortgage balance from loan data if available
        let estimatedMortgageBalance = 0;
        const mortgage = property.assessment?.mortgage;
        if (mortgage?.FirstConcurrent?.amount) {
            estimatedMortgageBalance = mortgage.FirstConcurrent.amount;
        } else if (mortgage?.amount) {
            estimatedMortgageBalance = mortgage.amount;
        } else if (property.mortgage?.amount) {
            estimatedMortgageBalance = property.mortgage.amount;
        }

        console.log("Extracted estimatedMortgageBalance:", estimatedMortgageBalance);

        const result: AtomResponse = {
            ownerNames,
            state,
            propertyType,
            estimatedValue: Math.round(estimatedValue),
            estimatedMortgageBalance: Math.round(estimatedMortgageBalance),
        };

        console.log("Returning property data:", result);

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

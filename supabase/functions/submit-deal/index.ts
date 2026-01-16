// StayFrank Supabase Edge Function: submit-deal
// This function creates a deal in EquityAdvance and returns the tracking link

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitDealRequest {
  submission_id: string;
  property_address: string;
  home_value: number;
  mortgage_balance: number;
  owner_names: string[];
  property_type: string;
  state: string;
  sl_eligible: boolean;
  sl_offer_amount: number | null;
  hei_eligible: boolean;
  hei_max_investment: number | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SubmitDealRequest = await req.json();
    
    // Get environment variables
    const equityAdvanceApiUrl = Deno.env.get("EQUITYADVANCE_API_URL");
    const equityAdvancePartnerKey = Deno.env.get("EQUITYADVANCE_PARTNER_KEY");
    
    if (!equityAdvanceApiUrl || !equityAdvancePartnerKey) {
      console.error("Missing EquityAdvance configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call EquityAdvance to create the deal
    const response = await fetch(equityAdvanceApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Partner-Key": equityAdvancePartnerKey,
      },
      body: JSON.stringify({
        property_address: body.property_address,
        home_value: body.home_value,
        mortgage_balance: body.mortgage_balance,
        owner_names: body.owner_names,
        // HEI max investment is what gets stored as max_investment in EquityAdvance
        max_investment: body.hei_max_investment || 0,
        // Additional context for the deal
        sl_eligible: body.sl_eligible,
        sl_offer_amount: body.sl_offer_amount,
        hei_eligible: body.hei_eligible,
        source: "stayfrank_portal",
        stayfrank_submission_id: body.submission_id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("EquityAdvance API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create partner deal", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    // Return the deal ID and tracking link
    return new Response(
      JSON.stringify({
        deal_id: result.deal_id,
        tracking_link: result.tracking_link,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in submit-deal:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

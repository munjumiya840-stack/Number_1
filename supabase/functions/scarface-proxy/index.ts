import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConfigRow {
  key: string;
  value: string;
}

async function loadConfig(supabase: ReturnType<typeof createClient>): Promise<Record<string, string>> {
  const keys = ["scarface_api_key", "scarface_base_url", "scarface_otp_price"];
  const { data } = await supabase
    .from("config")
    .select("key, value")
    .in("key", keys);
  const map: Record<string, string> = {};
  for (const row of (data || []) as ConfigRow[]) {
    map[row.key] = row.value;
  }
  return map;
}

interface OtpRecord {
  id: string;
  code: string;
  service: string;
  rawMessage: string;
  receivedAt: string;
}

interface ActiveNumber {
  id: string;
  msisdn: string;
  country: string;
  status: string;
  expiresAt: string;
  allocatedAt: string;
  otps: OtpRecord[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { endpoint, method, payload, userId } = body;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "missing_endpoint", message: "API endpoint path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "server_error", message: "Server is not properly configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Always load the API key from the database — never trust client-sent keys
    const config = await loadConfig(supabase);
    const apiKey = config["scarface_api_key"];
    const baseUrl = config["scarface_base_url"] || "https://nexaotpservice.com/api/v1";
    const otpPrice = parseFloat(config["scarface_otp_price"] || "0.50");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "api_key_not_configured",
          message: "The admin has not configured the OTP provider yet. Please contact support.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For allocation: verify user exists and isn't banned, but NO charge
    if (endpoint === "/numbers/allocate" && userId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, is_banned")
        .eq("id", userId)
        .maybeSingle();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "user_not_found", message: "Could not verify your account" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (profile.is_banned) {
        return new Response(
          JSON.stringify({ error: "banned", message: "Your account has been banned" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const targetUrl = `${baseUrl}${endpoint}`;
    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    };

    if (method && method !== "GET" && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    // For batch OTP polling: charge the user ONLY for newly received OTPs
    if (endpoint === "/numbers/batch-otps" && userId && response.ok) {
      try {
        const parsed = JSON.parse(data);
        const otpData: Record<string, OtpRecord[]> = parsed.data || {};

        // Count new OTPs (ones with IDs we haven't seen)
        // We track seen OTPs in a table to avoid double-charging
        const allNewOtps: OtpRecord[] = [];
        for (const [numberId, otps] of Object.entries(otpData)) {
          for (const otp of otps) {
            // Check if we already charged for this OTP
            const { data: existing } = await supabase
              .from("otp_charge_log")
              .select("id")
              .eq("otp_id", otp.id)
              .maybeSingle();

            if (!existing) {
              allNewOtps.push(otp);
              // Log the charge
              await supabase
                .from("otp_charge_log")
                .insert({
                  otp_id: otp.id,
                  user_id: userId,
                  number_id: numberId,
                  amount: otpPrice,
                  service: otp.service,
                });
            }
          }
        }

        // Deduct balance for all new OTPs
        if (allNewOtps.length > 0) {
          const totalCharge = allNewOtps.length * otpPrice;
          const { data: profile } = await supabase
            .from("profiles")
            .select("balance")
            .eq("id", userId)
            .maybeSingle();

          if (profile) {
            await supabase
              .from("profiles")
              .update({ balance: Math.max(0, profile.balance - totalCharge) })
              .eq("id", userId);
          }
        }
      } catch (chargeErr) {
        console.error("Failed to process OTP charges:", chargeErr);
      }
    }

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "proxy_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

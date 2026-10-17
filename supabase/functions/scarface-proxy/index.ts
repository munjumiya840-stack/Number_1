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

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "api_key_not_configured",
          message: "The admin has not configured the OTP provider yet. Please contact support.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For allocation endpoints, deduct balance from the user
    if (endpoint === "/numbers/allocate" && userId) {
      const otpPriceStr = config["scarface_otp_price"] || "0.50";
      const otpPrice = parseFloat(otpPriceStr);

      // Check user balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, balance, is_banned")
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

      if (profile.balance < otpPrice) {
        return new Response(
          JSON.stringify({
            error: "insufficient_balance",
            message: `Insufficient balance. You need at least $${otpPrice.toFixed(2)} to allocate a number. Please top up your wallet.`,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct balance
      const { error: deductError } = await supabase
        .from("profiles")
        .update({ balance: profile.balance - otpPrice })
        .eq("id", userId);

      if (deductError) {
        return new Response(
          JSON.stringify({ error: "balance_error", message: "Failed to process payment" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // If allocation failed, refund the balance
    if (endpoint === "/numbers/allocate" && userId && response.status >= 400) {
      const otpPriceStr = config["scarface_otp_price"] || "0.50";
      const otpPrice = parseFloat(otpPriceStr);
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .maybeSingle();
      if (profile) {
        await supabase
          .from("profiles")
          .update({ balance: profile.balance + otpPrice })
          .eq("id", userId);
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

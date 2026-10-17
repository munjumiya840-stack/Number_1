import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConfigRow { key: string; value: string; }

async function loadConfig(supabase: ReturnType<typeof createClient>): Promise<Record<string, string>> {
  const keys = ["scarface_api_key", "scarface_base_url", "scarface_otp_price"];
  const { data } = await supabase.from("config").select("key, value").in("key", keys);
  const map: Record<string, string> = {};
  for (const row of (data || []) as ConfigRow[]) { map[row.key] = row.value; }
  return map;
}

interface OtpRecord {
  id: string; code: string; service: string; rawMessage: string; receivedAt: string;
}

interface ActiveNumber {
  id: string; msisdn: string; country: string; status: string;
  expiresAt: string; allocatedAt: string; otps: OtpRecord[];
}

interface UserNumberRow {
  id: number; user_id: string; nexa_number_id: string; msisdn: string | null;
  country: string | null; status: string; prefix: string | null; expires_at: string | null;
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

    const config = await loadConfig(supabase);
    const apiKey = config["scarface_api_key"];
    const baseUrl = config["scarface_base_url"] || "https://nexaotpservice.com/api/v1";
    const otpPrice = parseFloat(config["scarface_otp_price"] || "0.50");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "api_key_not_configured", message: "The admin has not configured the OTP provider yet. Please contact support." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For allocation: verify user, allocate via Nexa, then record ownership
    if (endpoint === "/numbers/allocate" && method === "POST" && userId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles").select("id, is_banned").eq("id", userId).maybeSingle();

      if (profileError || !profile) {
        return new Response(JSON.stringify({ error: "user_not_found", message: "Could not verify your account" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (profile.is_banned) {
        return new Response(JSON.stringify({ error: "banned", message: "Your account has been banned" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Call Nexa API to allocate
      const targetUrl = `${baseUrl}/numbers/allocate`;
      const nresp = await fetch(targetUrl, {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
      const rawData = await nresp.text();

      if (!nresp.ok) {
        return new Response(rawData, { status: nresp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let allocated: ActiveNumber;
      try { allocated = JSON.parse(rawData) as ActiveNumber; }
      catch { return new Response(rawData, { status: nresp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

      // Record ownership in user_numbers table
      await supabase.from("user_numbers").insert({
        user_id: userId,
        nexa_number_id: allocated.id,
        msisdn: allocated.msisdn,
        country: allocated.country,
        status: "active",
        prefix: (payload as Record<string, unknown>)?.prefix as string || null,
        expires_at: allocated.expiresAt || null,
      });

      return new Response(rawData, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // For /numbers/active: ONLY return numbers owned by this user
    if (endpoint === "/numbers/active" && userId) {
      const { data: userNums } = await supabase
        .from("user_numbers")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const rows = (userNums || []) as UserNumberRow[];
      const result: ActiveNumber[] = rows.map((r) => ({
        id: r.nexa_number_id,
        msisdn: r.msisdn || "",
        country: r.country || "",
        status: r.status,
        expiresAt: r.expires_at || new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        allocatedAt: r.created_at,
        otps: [],
      }));

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For /numbers/batch-otps: fetch from Nexa but filter by user's numbers only
    if (endpoint === "/numbers/batch-otps" && userId) {
      // Get this user's numbers only
      const { data: userNums } = await supabase
        .from("user_numbers")
        .select("nexa_number_id")
        .eq("user_id", userId)
        .eq("status", "active");

      const userNumberIds = ((userNums || []) as { nexa_number_id: string }[]).map(r => r.nexa_number_id);

      if (userNumberIds.length === 0) {
        return new Response(JSON.stringify({ data: {}, numbers: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Call Nexa batch-otps
      const targetUrl = `${baseUrl}/numbers/batch-otps`;
      const nresp = await fetch(targetUrl, {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const rawData = await nresp.text();

      if (!nresp.ok) {
        return new Response(rawData, { status: nresp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let parsed: { data: Record<string, OtpRecord[]>; numbers: ActiveNumber[] };
      try { parsed = JSON.parse(rawData); } catch {
        return new Response(JSON.stringify({ data: {}, numbers: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter to only this user's numbers
      const filteredData: Record<string, OtpRecord[]> = {};
      for (const [numberId, otps] of Object.entries(parsed.data || {})) {
        if (userNumberIds.includes(numberId)) {
          filteredData[numberId] = otps;
        }
      }
      const filteredNumbers = (parsed.numbers || []).filter((n) => userNumberIds.includes(n.id));

      // Credit earnings for new OTPs (INSTANT credit on first OTP receipt)
      for (const [numberId, otps] of Object.entries(filteredData)) {
        for (const otp of otps) {
          const { data: existing } = await supabase
            .from("otp_charge_log")
            .select("id")
            .eq("otp_id", otp.id)
            .maybeSingle();

          if (!existing) {
            // Log the earnings
            await supabase.from("otp_charge_log").insert({
              otp_id: otp.id, user_id: userId, number_id: numberId,
              amount: otpPrice, service: otp.service, is_earnings: true,
            });

            // Credit the user's balance immediately
            const { data: prof } = await supabase
              .from("profiles").select("balance, total_earnings").eq("id", userId).maybeSingle();

            if (prof) {
              await supabase.from("profiles").update({
                balance: (prof.balance || 0) + otpPrice,
                total_earnings: (prof.total_earnings || 0) + otpPrice,
              }).eq("id", userId);
            }
          }
        }
      }

      return new Response(JSON.stringify({ data: filteredData, numbers: filteredNumbers }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For /liveaccess: proxy directly (read-only, no user filtering needed)
    const targetUrl = `${baseUrl}${endpoint}`;
    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    };

    if (method && method !== "GET" && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": response.headers.get("Content-Type") || "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: "proxy_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

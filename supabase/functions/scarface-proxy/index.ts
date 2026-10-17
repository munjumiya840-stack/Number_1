import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SCARFACE_BASE = "https://nexaotpservice.com/api/v1";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { apiKey: clientKey, endpoint, method, payload } = body;

    // Resolve API key: use client-provided key, or auto-load from config table
    let apiKey = clientKey;

    if (!apiKey) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: configRow } = await supabase
          .from("config")
          .select("value")
          .eq("key", "scarface_api_key")
          .maybeSingle();
        if (configRow?.value) {
          apiKey = configRow.value;
        }
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "missing_api_key",
          message: "ScarFace API key not configured. Add it in the Range Numbers page or set scarface_api_key in config.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "missing_endpoint", message: "API endpoint path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = `${SCARFACE_BASE}${endpoint}`;
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

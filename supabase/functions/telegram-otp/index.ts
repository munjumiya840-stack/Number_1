import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  try {
    const resp = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("Telegram sendMessage error:", resp.status, errBody);
    }
    return resp.ok;
  } catch (err) {
    console.error("Telegram sendMessage exception:", err);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, telegramId, code } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Action: send OTP code to Telegram
    if (action === "send") {
      if (!telegramId) {
        return new Response(
          JSON.stringify({ error: "missing_telegram_id", message: "Telegram ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Look up user by telegram_id in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, is_banned, telegram_id")
        .eq("telegram_id", String(telegramId))
        .maybeSingle();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "user_not_found", message: "No account found with this Telegram ID. Make sure you have registered and linked your Telegram ID in your profile, and that you have sent /start to the bot." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (profile.is_banned) {
        return new Response(
          JSON.stringify({ error: "banned", message: "Your account has been banned." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get bot token from config
      const { data: configRow } = await supabase
        .from("config")
        .select("value")
        .eq("key", "bot_api_key")
        .maybeSingle();

      if (!configRow?.value) {
        return new Response(
          JSON.stringify({ error: "bot_not_configured", message: "Telegram bot is not configured. Please contact the admin." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate 6-digit code, valid for 2 minutes
      const otpCode = generateCode();
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

      // Invalidate previous unused codes
      await supabase
        .from("telegram_otp_codes")
        .update({ used: true })
        .eq("telegram_id", String(telegramId))
        .eq("used", false);

      // Insert new code
      const { error: insertError } = await supabase
        .from("telegram_otp_codes")
        .insert({
          telegram_id: String(telegramId),
          code: otpCode,
          email: profile.full_name || null,
          expires_at: expiresAt,
          used: false,
        });

      if (insertError) {
        console.error("Failed to insert OTP code:", insertError);
        return new Response(
          JSON.stringify({ error: "db_error", message: "Failed to store verification code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send via Telegram bot
      const message = `🔐 <b>GLOBAL NUMBER Login Code</b>\n\nYour verification code is: <b>${otpCode}</b>\n\n⏱ This code expires in 2 minutes.\n\nDo not share this code with anyone.`;
      const sent = await sendTelegramMessage(configRow.value, String(telegramId), message);

      if (!sent) {
        return new Response(
          JSON.stringify({ error: "telegram_send_failed", message: "Failed to send code via Telegram. Make sure you have started a chat with the bot by sending /start." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent to your Telegram" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: verify OTP code and return session tokens
    if (action === "verify") {
      if (!telegramId || !code) {
        return new Response(
          JSON.stringify({ error: "missing_params", message: "Telegram ID and verification code are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the latest unused code for this telegram_id
      const { data: otpRecord } = await supabase
        .from("telegram_otp_codes")
        .select("*")
        .eq("telegram_id", String(telegramId))
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return new Response(
          JSON.stringify({ error: "no_code", message: "No active code found. Please request a new one." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (new Date(otpRecord.expires_at) < new Date()) {
        await supabase
          .from("telegram_otp_codes")
          .update({ used: true })
          .eq("id", otpRecord.id);
        return new Response(
          JSON.stringify({ error: "expired", message: "Code has expired. Please request a new one." }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check code matches
      if (otpRecord.code !== String(code)) {
        return new Response(
          JSON.stringify({ error: "invalid_code", message: "Incorrect code. Please try again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark code as used
      await supabase
        .from("telegram_otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);

      // Get user profile
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, full_name, is_banned, is_admin, is_super_admin, telegram_id")
        .eq("telegram_id", String(telegramId))
        .maybeSingle();

      if (!userProfile) {
        return new Response(
          JSON.stringify({ error: "user_not_found", message: "Account not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userProfile.is_banned) {
        return new Response(
          JSON.stringify({ error: "banned", message: "Your account has been banned." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // The profile.id is the Supabase Auth user id
      // Use admin API to mint a session for this user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink(
        "magiclink",
        userProfile.full_name,
        { type: "magiclink" }
      );

      if (sessionError || !sessionData) {
        console.error("Failed to generate link:", sessionError);
        return new Response(
          JSON.stringify({ error: "auth_failed", message: "Failed to create login session. Please try email login." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // The properties object contains access_token and refresh_token
      const properties = sessionData.properties;
      const accessToken = properties?.access_token;
      const refreshToken = properties?.refresh_token;

      if (!accessToken || !refreshToken) {
        console.error("No tokens in generated link");
        return new Response(
          JSON.stringify({ error: "auth_failed", message: "Failed to create login session. Please try email login." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          access_token: accessToken,
          refresh_token: refreshToken,
          email: userProfile.full_name,
          userId: userProfile.id,
          isAdmin: userProfile.is_admin,
          isSuperAdmin: userProfile.is_super_admin,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "invalid_action", message: "Action must be 'send' or 'verify'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("telegram-otp error:", message);
    return new Response(
      JSON.stringify({ error: "server_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

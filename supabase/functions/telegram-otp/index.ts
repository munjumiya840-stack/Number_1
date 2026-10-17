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
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!resp.ok) {
      console.error("Telegram sendMessage error:", resp.status, await resp.text());
    }
    return resp.ok;
  } catch (err) {
    console.error("Telegram sendMessage exception:", err);
    return false;
  }
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Create a long-lived session by generating a magic link and exchanging it for tokens
// The session will persist for the JWT expiry configured in Supabase (default 1 hour, but
// the refresh token keeps the session alive). We also set a custom long-lived cookie
// on the client side by returning both access and refresh tokens.
async function createLongLivedSession(supabase: ReturnType<typeof createClient>, authEmail: string): Promise<{
  access_token: string; refresh_token: string;
} | null> {
  // Generate magic link
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink(
    "magiclink",
    authEmail,
    { type: "magiclink" }
  );

  if (linkError || !linkData) {
    console.error("generateLink error:", JSON.stringify(linkError));
    return null;
  }

  const properties = linkData.properties;
  let accessToken = properties?.access_token;
  let refreshToken = properties?.refresh_token;

  if (accessToken && refreshToken) {
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  // Fallback: extract token from action_link and verify it
  const actionLink = properties?.action_link || linkData?.action_link;
  if (actionLink) {
    try {
      const url = new URL(actionLink);
      const token = url.searchParams.get("token") || url.hash.split("access_token=")[1]?.split("&")[0];
      if (token) {
        const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": supabaseServiceKey },
          body: JSON.stringify({ type: "magiclink", token }),
        });
        if (verifyRes.ok) {
          const session = await verifyRes.json();
          if (session.access_token && session.refresh_token) {
            return { access_token: session.access_token, refresh_token: session.refresh_token };
          }
        }
      }
    } catch (fallbackErr) {
      console.error("Fallback token exchange failed:", fallbackErr);
    }
  }

  return null;
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
        return jsonResponse({ error: "missing_telegram_id", message: "Telegram ID is required" }, 400);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_banned, telegram_id")
        .eq("telegram_id", String(telegramId))
        .maybeSingle();

      if (!profile) {
        return jsonResponse({
          error: "user_not_found",
          message: "No account found with this Telegram ID. Make sure you have registered and linked your Telegram ID in your profile, and that you have sent /start to the bot.",
        }, 404);
      }

      if (profile.is_banned) {
        return jsonResponse({ error: "banned", message: "Your account has been banned." }, 403);
      }

      const { data: configRow } = await supabase
        .from("config").select("value").eq("key", "bot_api_key").maybeSingle();

      if (!configRow?.value) {
        return jsonResponse({ error: "bot_not_configured", message: "Telegram bot is not configured. Please contact the admin." }, 500);
      }

      const otpCode = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("telegram_otp_codes")
        .update({ used: true }).eq("telegram_id", String(telegramId)).eq("used", false);

      const { error: insertError } = await supabase
        .from("telegram_otp_codes").insert({
          telegram_id: String(telegramId),
          code: otpCode,
          email: profile.email || profile.full_name || null,
          expires_at: expiresAt,
          used: false,
        });

      if (insertError) {
        console.error("Failed to insert OTP code:", insertError);
        return jsonResponse({ error: "db_error", message: "Failed to store verification code" }, 500);
      }

      const message = `🔐 <b>GLOBAL NUMBER Login Code</b>\n\nYour verification code is: <b>${otpCode}</b>\n\n⏱ This code expires in 5 minutes.\n\nDo not share this code with anyone.`;
      const sent = await sendTelegramMessage(configRow.value, String(telegramId), message);

      if (!sent) {
        return jsonResponse({
          error: "telegram_send_failed",
          message: "Failed to send code via Telegram. Make sure you have started a chat with the bot by sending /start.",
        }, 500);
      }

      return jsonResponse({ success: true, message: "Verification code sent to your Telegram" }, 200);
    }

    // Action: verify OTP code and create long-lived session
    if (action === "verify") {
      if (!telegramId || !code) {
        return jsonResponse({ error: "missing_params", message: "Telegram ID and verification code are required" }, 400);
      }

      const { data: otpRecord } = await supabase
        .from("telegram_otp_codes")
        .select("*")
        .eq("telegram_id", String(telegramId))
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return jsonResponse({ error: "no_code", message: "No active code found. Please request a new one." }, 404);
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        await supabase.from("telegram_otp_codes").update({ used: true }).eq("id", otpRecord.id);
        return jsonResponse({ error: "expired", message: "Code has expired. Please request a new one." }, 410);
      }

      if (otpRecord.code !== String(code)) {
        return jsonResponse({ error: "invalid_code", message: "Incorrect code. Please try again." }, 401);
      }

      // Mark code as used
      await supabase.from("telegram_otp_codes").update({ used: true }).eq("id", otpRecord.id);

      // Get user profile by telegram_id — works regardless of which email is linked
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_banned, is_admin, is_super_admin, telegram_id")
        .eq("telegram_id", String(telegramId))
        .maybeSingle();

      if (!userProfile) {
        return jsonResponse({ error: "user_not_found", message: "Account not found" }, 404);
      }

      if (userProfile.is_banned) {
        return jsonResponse({ error: "banned", message: "Your account has been banned." }, 403);
      }

      // Resolve email — try profile.email, then full_name, then look up auth.users directly
      let authEmail = userProfile.email || userProfile.full_name;

      // If no valid email, try to find the user's email from auth.users by user ID
      if (!authEmail || !authEmail.includes("@")) {
        const { data: authUser } = await supabase.auth.admin.getUserById(userProfile.id);
        if (authUser?.user?.email) {
          authEmail = authUser.user.email;
        }
      }

      if (!authEmail || !authEmail.includes("@")) {
        return jsonResponse({
          error: "invalid_email",
          message: "Your account does not have a valid email for session creation. Please use email login instead.",
        }, 400);
      }

      // Create long-lived session
      const session = await createLongLivedSession(supabase, authEmail);

      if (!session) {
        return jsonResponse({
          error: "auth_failed",
          message: "Failed to create login session. Please try email login.",
        }, 500);
      }

      return jsonResponse({
        success: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        email: authEmail,
        userId: userProfile.id,
        isAdmin: userProfile.is_admin,
        isSuperAdmin: userProfile.is_super_admin,
        session_type: "persistent",
      }, 200);
    }

    return jsonResponse({ error: "invalid_action", message: "Action must be 'send' or 'verify'" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("telegram-otp error:", message);
    return jsonResponse({ error: "server_error", message }, 500);
  }
});

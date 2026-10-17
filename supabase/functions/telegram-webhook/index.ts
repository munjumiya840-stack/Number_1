import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
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
  return resp.ok;
}

async function setWebhook(botToken: string, webhookUrl: string) {
  const resp = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    }
  );
  return resp.ok;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle setup request to register the webhook with Telegram
    if (req.method === "GET") {
      const url = new URL(req.url);
      const setup = url.searchParams.get("setup");
      if (setup === "true") {
        const { data: configRow } = await supabase
          .from("config")
          .select("value")
          .eq("key", "bot_api_key")
          .maybeSingle();

        if (!configRow?.value) {
          return new Response(
            JSON.stringify({ error: "bot_not_configured", message: "Bot API key not set in admin settings" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook`;
        const success = await setWebhook(configRow.value, webhookUrl);

        if (success) {
          return new Response(
            JSON.stringify({ success: true, message: "Webhook registered with Telegram", url: webhookUrl }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: "webhook_setup_failed", message: "Failed to set webhook" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Handle Telegram webhook update (POST)
    if (req.method === "POST") {
      const update = await req.json();

      // Get bot token
      const { data: configRow } = await supabase
        .from("config")
        .select("value")
        .eq("key", "bot_api_key")
        .maybeSingle();

      if (!configRow?.value) {
        return new Response(
          JSON.stringify({ error: "bot_not_configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const botToken = configRow.value;
      const message = update.message;
      const callbackQuery = update.callback_query;

      // Handle /start command
      if (message && message.text === "/start") {
        const chatId = String(message.chat.id);
        const userId = String(message.from.id);
        const userName = message.from.first_name || message.from.username || "there";
        const username = message.from.username || null;
        const firstName = message.from.first_name || null;

        // Always upsert the Telegram ID into telegram_user_ids table
        await supabase
          .from("telegram_user_ids")
          .upsert({
            telegram_id: userId,
            username,
            first_name: firstName,
          }, { onConflict: "telegram_id" });

        // Check if a profile already exists with this telegram_id
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("telegram_id", userId)
          .maybeSingle();

        // Link the captured ID to the profile if found
        if (existingProfile) {
          await supabase
            .from("telegram_user_ids")
            .update({ linked_user_id: existingProfile.id })
            .eq("telegram_id", userId);
          const greeting = `👋 Welcome back, <b>${userName}</b>!\n\nYour Telegram ID is already linked to your GLOBAL NUMBER account.\n\nYour Telegram ID: <code>${userId}</code>\n\nYou can use this ID to log in via Telegram on the website.`;
          await sendTelegramMessage(botToken, chatId, greeting);
        } else {
          const greeting = `👋 Welcome, <b>${userName}</b>!\n\nWelcome to <b>GLOBAL NUMBER</b>! 🌍\n\nYour Telegram ID has been captured: <code>${userId}</code>\n\n🔐 <b>To log in on the website:</b>\n1. Go to the login page\n2. Select "Telegram" login\n3. Enter this ID: <code>${userId}</code>\n4. You'll receive a verification code right here in Telegram\n\nIf you don't have an account yet, please register first on the website and link this Telegram ID in your profile settings.`;
          await sendTelegramMessage(botToken, chatId, greeting);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle /help command
      if (message && message.text === "/help") {
        const chatId = String(message.chat.id);
        const userId = String(message.from.id);
        const helpText = `🤖 <b>GLOBAL NUMBER Bot</b>\n\nCommands:\n/start — Get your Telegram ID and login instructions\n/help — Show this help message\n\nYour Telegram ID: <code>${userId}</code>\n\nUse this ID to log in via Telegram on the website.`;
        await sendTelegramMessage(botToken, chatId, helpText);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle /id command — just return the user's Telegram ID
      if (message && message.text === "/id") {
        const chatId = String(message.chat.id);
        const userId = String(message.from.id);
        const username = message.from.username || null;
        const firstName = message.from.first_name || null;
        await supabase
          .from("telegram_user_ids")
          .upsert({ telegram_id: userId, username, first_name: firstName }, { onConflict: "telegram_id" });
        const idText = `Your Telegram ID is: <code>${userId}</code>`;
        await sendTelegramMessage(botToken, chatId, idText);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle generic messages — also capture the ID
      if (message && message.text) {
        const chatId = String(message.chat.id);
        const userId = String(message.from.id);
        const username = message.from.username || null;
        const firstName = message.from.first_name || null;
        await supabase
          .from("telegram_user_ids")
          .upsert({ telegram_id: userId, username, first_name: firstName }, { onConflict: "telegram_id" });
        const replyText = `Hello! 👋\n\nYour Telegram ID is: <code>${userId}</code>\n\nUse /start to get login instructions or /help for available commands.`;
        await sendTelegramMessage(botToken, chatId, replyText);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle callback queries (button presses)
      if (callbackQuery) {
        const chatId = String(callbackQuery.message.chat.id);
        const userId = String(callbackQuery.from.id);
        const data = callbackQuery.data;

        if (data === "get_id") {
          const replyText = `Your Telegram ID is: <code>${userId}</code>`;
          await sendTelegramMessage(botToken, chatId, replyText);
        }
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "No action taken" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "method_not_allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "server_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

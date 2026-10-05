import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TelegramBotConfig } from '../types';

export interface TelegramApiResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

/**
 * Gets the current active domain and origin of the Mini App.
 * Handles running inside Vite dev server, Google Cloud Run, and custom domains.
 */
export function getCurrentMiniAppUrl(): string {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const origin = window.location.origin;
      // Ensure clean URL without trailing slash or hash
      return origin.replace(/\/+$/, '');
    }
  } catch (e) {
    // Fallback if cross-origin frame prevents access
  }
  return 'https://ais-dev-waceznisqcewh4bktwtkaj-548670437972.europe-west2.run.app';
}

/**
 * 1. Validate Telegram Bot Token and retrieve bot identity details
 */
export async function fetchTelegramBotInfo(token: string): Promise<{ success: boolean; data?: TelegramUser; error?: string }> {
  const cleanToken = token.trim();
  if (!cleanToken || !cleanToken.includes(':')) {
    return { success: false, error: 'Invalid token format. Telegram tokens look like "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ".' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data: TelegramApiResponse<TelegramUser> = await response.json();

    if (data.ok && data.result) {
      return { success: true, data: data.result };
    } else {
      return { success: false, error: data.description || 'Failed to authenticate bot token with Telegram.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error connecting to Telegram Bot API.' };
  }
}

/**
 * 2. Get current webhook status from Telegram
 */
export async function fetchTelegramWebhookInfo(token: string): Promise<{ success: boolean; data?: TelegramWebhookInfo; error?: string }> {
  const cleanToken = token.trim();
  try {
    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/getWebhookInfo`);
    const data: TelegramApiResponse<TelegramWebhookInfo> = await response.json();

    if (data.ok && data.result) {
      return { success: true, data: data.result };
    } else {
      return { success: false, error: data.description || 'Failed to query webhook status.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to communicate with Telegram API.' };
  }
}

/**
 * 3. Set Webhook URL on Telegram
 */
export async function setTelegramBotWebhook(
  token: string, 
  webhookUrl: string, 
  dropPendingUpdates = false
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanToken = token.trim();
  const cleanUrl = webhookUrl.trim();

  if (!cleanUrl.startsWith('https://')) {
    return { success: false, error: 'Telegram requires a valid HTTPS webhook URL.' };
  }

  try {
    const endpoint = `https://api.telegram.org/bot${cleanToken}/setWebhook`;
    const payload = {
      url: cleanUrl,
      drop_pending_updates: dropPendingUpdates,
      allowed_updates: ['message', 'callback_query', 'inline_query']
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data: TelegramApiResponse<boolean> = await response.json();
    if (data.ok) {
      return { success: true, message: data.description || 'Webhook configured successfully on Telegram.' };
    } else {
      return { success: false, error: data.description || 'Telegram rejected webhook setup.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error setting webhook.' };
  }
}

/**
 * 4. Delete Webhook (Switches bot back to long-polling mode)
 */
export async function deleteTelegramBotWebhook(
  token: string, 
  dropPendingUpdates = false
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanToken = token.trim();
  try {
    const endpoint = `https://api.telegram.org/bot${cleanToken}/deleteWebhook?drop_pending_updates=${dropPendingUpdates}`;
    const response = await fetch(endpoint);
    const data: TelegramApiResponse<boolean> = await response.json();

    if (data.ok) {
      return { success: true, message: 'Webhook removed. Bot can now use long-polling script.' };
    } else {
      return { success: false, error: data.description || 'Failed to remove webhook.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error deleting webhook.' };
  }
}

/**
 * 5. Configure Chat Menu Button to open Mini App directly
 */
export async function setTelegramBotMenuButton(
  token: string, 
  appUrl: string, 
  buttonText = '🚀 Launch Arbitrage Engine',
  botUsername?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanToken = token.trim();
  try {
    const endpoint = `https://api.telegram.org/bot${cleanToken}/setChatMenuButton`;
    let targetUrl = appUrl.trim();
    if (botUsername) {
      const cleanBotName = botUsername.replace('@', '').trim();
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + `bot=${encodeURIComponent(cleanBotName)}`;
    }

    const payload = {
      menu_button: {
        type: 'web_app',
        text: buttonText,
        web_app: {
          url: targetUrl
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data: TelegramApiResponse<boolean> = await response.json();
    if (data.ok) {
      return { success: true, message: 'Menu Button configured! Users will now see the Mini App launcher button in bot chat.' };
    } else {
      return { success: false, error: data.description || 'Failed to configure Telegram Menu Button.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error setting menu button.' };
  }
}

/**
 * 6. Set Bot Commands list in Telegram (/start, /app, /plans, /referral, /support)
 * Registers multilingual command lists for English (default), Russian (ru), and Chinese (zh).
 */
export async function setTelegramBotCommands(token: string): Promise<{ success: boolean; error?: string }> {
  const cleanToken = token.trim();
  try {
    const endpoint = `https://api.telegram.org/bot${cleanToken}/setMyCommands`;

    // 1. Default (English)
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: '🚀 Launch AI Crypto Arbitrage Engine' },
          { command: 'app', description: '📱 Open Trading Mini App' },
          { command: 'plans', description: '📊 View Active Yield Packages' },
          { command: 'referral', description: '👥 Referral Program & Invite Link' },
          { command: 'support', description: '💬 Contact Official Support (@ai_zke)' }
        ]
      })
    });

    // 2. Russian (ru)
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_code: 'ru',
        commands: [
          { command: 'start', description: '🚀 Запустить арбитражный Mini App' },
          { command: 'app', description: '📱 Открыть торговый терминал' },
          { command: 'plans', description: '📊 Инвестиционные планы и доходность' },
          { command: 'referral', description: '👥 Реферальная программа и ссылка' },
          { command: 'support', description: '💬 Официальная поддержка (@ai_zke)' }
        ]
      })
    });

    // 3. Chinese (zh)
    const resZh = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_code: 'zh',
        commands: [
          { command: 'start', description: '🚀 启动 AI 加密套利 Mini App' },
          { command: 'app', description: '📱 打开套利交易终端' },
          { command: 'plans', description: '📊 收益策略与投资计划' },
          { command: 'referral', description: '👥 邀请合伙人分红计划' },
          { command: 'support', description: '💬 官方专属客服 (@ai_zke)' }
        ]
      })
    });

    const data: TelegramApiResponse<boolean> = await resZh.json();
    return { success: true, error: data.description };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Set Bot Welcome Description on Telegram (Shown before clicking /start)
 */
export async function setTelegramBotDescription(
  token: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanToken = token.trim();
  const textEn = description || '🚀 AI Crypto Arbitrage Engine\n\nInstant multi-exchange liquidity scanner with automated yield pools and zero-fee deposits.\n\nTap Start to launch your terminal!';
  const textRu = '🚀 AI Crypto Arbitrage Engine\n\nАвтоматизированный межбиржевой арбитраж и сканирование ликвидности с мгновенным выводом.\n\nНажмите Старт для запуска!';
  const textZh = '🚀 AI 加密货币跨交易所套利引擎\n\n全自动高频价差套利与流动性扫描，零手续费入金与实时收益结算。\n\n点击开始即可启动交易终端！';

  try {
    const endpoint = `https://api.telegram.org/bot${cleanToken}/setMyDescription`;
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: textEn })
    });
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: textRu, language_code: 'ru' })
    });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: textZh, language_code: 'zh' })
    });
    const data: TelegramApiResponse<boolean> = await response.json();
    return { success: Boolean(data.ok), error: data.description };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Set Bot Short Description (Shown in Bot Profile Bio)
 */
export async function setTelegramBotShortDescription(
  token: string,
  shortDescription?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanToken = token.trim();
  const textEn = shortDescription || '⚡ Automated High-Yield Crypto Arbitrage Terminal on Telegram';
  const textRu = '⚡ Автоматизированный арбитражный торговый терминал в Telegram';
  const textZh = '⚡ Telegram 全自动高收益加密货币量化套利交易终端';

  try {
    const endpoint = `https://api.telegram.org/bot${cleanToken}/setMyShortDescription`;
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_description: textEn })
    });
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_description: textRu, language_code: 'ru' })
    });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_description: textZh, language_code: 'zh' })
    });
    const data: TelegramApiResponse<boolean> = await response.json();
    return { success: Boolean(data.ok), error: data.description };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 7. Send a test message from bot to an admin chat ID
 */
export async function sendTelegramTestMessage(
  token: string, 
  chatId: string | number, 
  text: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanToken = token.trim();
  try {
    const endpoint = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data: TelegramApiResponse<any> = await response.json();
    if (data.ok) {
      return { success: true, message: `Test message successfully sent to Chat ID ${chatId}!` };
    } else {
      return { success: false, error: data.description || 'Failed to deliver test message.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error sending test message.' };
  }
}

/**
 * Resolves full blockchain scanner URL dynamically for Tx verification
 */
export function getBlockchainScannerUrl(coin: string, network: string, txid: string): string {
  const cleanTx = (txid || '').trim();
  if (!cleanTx || cleanTx === 'pending' || cleanTx.startsWith('DEMO_') || cleanTx.startsWith('STARS_')) {
    return 'https://t.me/ai_zke';
  }
  const net = (network || '').toUpperCase();
  const c = (coin || '').toUpperCase();

  if (net.includes('TRC20') || net.includes('TRON') || c === 'TRX') {
    return `https://tronscan.org/#/transaction/${cleanTx}`;
  }
  if (net.includes('BEP20') || net.includes('BSC') || net.includes('BINANCE') || c === 'BNB') {
    return `https://bscscan.com/tx/${cleanTx}`;
  }
  if (net.includes('ERC20') || net.includes('ETH') || net.includes('ETHEREUM')) {
    return `https://etherscan.io/tx/${cleanTx}`;
  }
  if (net.includes('TON') || c === 'TON') {
    return `https://tonviewer.com/transaction/${cleanTx}`;
  }
  if (net.includes('BTC') || c === 'BTC' || net.includes('BITCOIN')) {
    return `https://mempool.space/tx/${cleanTx}`;
  }
  if (net.includes('SOL') || c === 'SOL' || net.includes('SOLANA')) {
    return `https://solscan.io/tx/${cleanTx}`;
  }
  return `https://tronscan.org/#/transaction/${cleanTx}`;
}

/**
 * Send Instant Notification to Admin & Dedicated Admin Channel when a Deposit is submitted or officially confirmed
 */
export async function notifyAdminDepositAlert(deposit: {
  orderId: string;
  userId: string;
  telegramUsername?: string | null;
  telegramId?: number | string | null;
  usdAmount: number;
  cryptoAmount?: string;
  coin: string;
  network: string;
  depositAddress: string;
  txid: string;
  status?: string;
  fromBot?: boolean;
  botName?: string | null;
  sourceBotUsername?: string | null;
  preferredBotId?: string | null;
}): Promise<boolean> {
  try {
    const bots = await getTelegramBotsList();
    let directBotToken = '';
    let channelBotToken = '';
    let activeChannelBotUsername = '';

    // Read system settings for Admin Channel ID, Channel Sender Bot, & Admin IDs
    const adminTargets: string[] = ['5951882585']; // Primary admin ID
    let adminChannelId = '';
    let channelAlertBotId = '';

    try {
      const sysDoc = await getDoc(doc(db, 'system_config', 'settings'));
      if (sysDoc.exists()) {
        const setts = sysDoc.data();
        if (setts.adminChannelId) {
          adminChannelId = String(setts.adminChannelId).trim();
        }
        if (setts.channelAlertBotId) {
          channelAlertBotId = String(setts.channelAlertBotId).trim();
        }
        if (setts.adminTelegramIds && Array.isArray(setts.adminTelegramIds)) {
          setts.adminTelegramIds.forEach((id: any) => {
            if (id && !adminTargets.includes(String(id))) {
              adminTargets.push(String(id));
            }
          });
        }
      }
    } catch (e) {}

    // A. Resolve User Direct Notification Bot Token (Origin Bot if specified)
    if (deposit.sourceBotUsername) {
      const cleanSource = deposit.sourceBotUsername.replace('@', '').toLowerCase();
      const matched = bots.find(b => b.botUsername && b.botUsername.toLowerCase() === cleanSource);
      if (matched && matched.token) {
        directBotToken = matched.token;
      }
    }

    // B. Resolve Channel Alert Sender Bot Token
    if (channelAlertBotId && channelAlertBotId !== 'auto') {
      const cleanTarget = channelAlertBotId.replace('@', '').toLowerCase();
      const matchedChannelBot = bots.find(b => 
        b.id === channelAlertBotId || 
        (b.botUsername && b.botUsername.toLowerCase() === cleanTarget) ||
        String(b.botId) === channelAlertBotId
      );
      if (matchedChannelBot && matchedChannelBot.token) {
        channelBotToken = matchedChannelBot.token;
        activeChannelBotUsername = matchedChannelBot.botUsername;
      }
    }

    // C. Fallback: Primary Bot or First Active Bot
    const primary = bots.find(b => b.isPrimary && b.isActive) || bots.find(b => b.isActive) || bots[0];
    if (primary && primary.token) {
      if (!directBotToken) directBotToken = primary.token;
      if (!channelBotToken) {
        channelBotToken = primary.token;
        activeChannelBotUsername = primary.botUsername;
      }
    }

    if (!directBotToken && !channelBotToken) {
      try {
        const sysDoc = await getDoc(doc(db, 'system_config', 'settings'));
        if (sysDoc.exists()) {
          const fallbackToken = sysDoc.data().primaryBotToken || '';
          directBotToken = fallbackToken;
          channelBotToken = fallbackToken;
        }
      } catch (e) {}
    }

    if (!directBotToken && !channelBotToken) {
      console.warn('No active Telegram bot token found to dispatch deposit alert.');
      return false;
    }

    const isApproved = deposit.status === 'approved';
    const title = isApproved
      ? `✅ <b>OFFICIAL DEPOSIT CONFIRMED & CREDITED!</b>`
      : `🚨 <b>NEW DEPOSIT SUBMITTED FOR REVIEW</b>`;

    const statusBadge = isApproved
      ? `🟢 <b>Status:</b> <b>VERIFIED & CREDITED TO WALLET</b>\n`
      : `🟡 <b>Status:</b> <b>PENDING MANUAL REVIEW</b>\n`;

    const botTag = deposit.sourceBotUsername 
      ? `@${deposit.sourceBotUsername.replace('@', '')}` 
      : (deposit.botName || (activeChannelBotUsername ? `@${activeChannelBotUsername}` : 'Main Mini App'));

    const scannerUrl = getBlockchainScannerUrl(deposit.coin, deposit.network, deposit.txid);
    const appUrl = getCurrentMiniAppUrl();
    const userTgLink = deposit.telegramUsername 
      ? `https://t.me/${deposit.telegramUsername}` 
      : (deposit.telegramId ? `tg://user?id=${deposit.telegramId}` : appUrl);

    const text = 
      `${title}\n\n` +
      `🤖 <b>Origin Bot:</b> <b>${botTag}</b>\n` +
      `👤 <b>Trader:</b> @${deposit.telegramUsername || 'Trader'} (ID: <code>${deposit.telegramId || deposit.userId}</code>)\n` +
      `💰 <b>Amount (USD):</b> <b>$${deposit.usdAmount.toFixed(2)} USD</b>\n` +
      `🪙 <b>Crypto Holding:</b> <b>${deposit.cryptoAmount || deposit.usdAmount} ${deposit.coin}</b>\n` +
      `🌐 <b>Network:</b> <b>${deposit.network}</b>\n` +
      `🏷️ <b>Order ID:</b> <code>${deposit.orderId}</code>\n` +
      statusBadge +
      `📥 <b>Deposit Target Address:</b>\n<code>${deposit.depositAddress}</code>\n\n` +
      `🔗 <b>TxHash / Proof Hash:</b>\n<code>${deposit.txid}</code>\n\n` +
      `⚡ <i>Crypto Arbitrage Central Operations Engine</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🔍 Verify Tx Scanner", url: scannerUrl },
          { text: "👤 Contact Trader", url: userTgLink }
        ],
        [
          { text: "⚡ Open Admin Control Desk", url: `${appUrl}?startapp=admin` }
        ]
      ]
    };

    // 1. Send to Dedicated Admin Channel if configured
    if (adminChannelId) {
      let channelSent = false;
      
      // Try with chosen channel bot token first
      if (channelBotToken) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${channelBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminChannelId,
              text: text,
              parse_mode: 'HTML',
              reply_markup: inlineKeyboard
            })
          });
          const resData = await res.json();
          if (resData.ok) {
            channelSent = true;
          } else {
            console.warn(`Channel send with bot ${activeChannelBotUsername} failed: ${resData.description}. Trying alternative bots...`);
          }
        } catch (err) {
          console.warn(`Failed to send deposit alert to channel ${adminChannelId}:`, err);
        }
      }

      // Fallback: If chosen bot was not admin or failed, try other connected bots
      if (!channelSent && bots.length > 1) {
        for (const altBot of bots) {
          if (altBot.token === channelBotToken || !altBot.token || !altBot.isActive) continue;
          try {
            const res = await fetch(`https://api.telegram.org/bot${altBot.token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: adminChannelId,
                text: text,
                parse_mode: 'HTML',
                reply_markup: inlineKeyboard
              })
            });
            const resData = await res.json();
            if (resData.ok) {
              channelSent = true;
              console.log(`✅ Channel alert successfully delivered via alternative bot @${altBot.botUsername}`);
              break;
            }
          } catch (e) {}
        }
      }
    }

    // 2. Dispatch to individual Admin Users
    const finalDirectToken = directBotToken || channelBotToken;
    for (const adminChatId of adminTargets) {
      if (!adminChatId || isNaN(Number(adminChatId)) || adminChatId === adminChannelId) continue;
      try {
        await fetch(`https://api.telegram.org/bot${finalDirectToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: text,
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard
          })
        });
      } catch (err) {
        console.warn(`Failed to send deposit alert to admin ${adminChatId}:`, err);
      }
    }

    return true;
  } catch (err) {
    console.error('Error dispatching admin deposit notification:', err);
    return false;
  }
}

/**
 * Generates an official Telegram Stars (XTR) Invoice Link via Telegram Bot API
 */
export async function createTelegramStarsInvoiceLink(params: {
  orderId: string;
  userId: string;
  usdAmount: number;
  starsAmount: number;
}): Promise<{ success: boolean; invoiceUrl?: string; error?: string }> {
  try {
    // 1. Attempt server API route /api/stars-invoice first
    try {
      const serverRes = await fetch('/api/stars-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }).then(r => r.json());

      if (serverRes && serverRes.success && serverRes.invoiceUrl) {
        return { success: true, invoiceUrl: serverRes.invoiceUrl };
      }
    } catch (err) {
      console.warn('Server stars-invoice route unreachable, using direct Bot API:', err);
    }

    // 2. Direct Bot API fallback
    let activeToken = '';
    const bots = await getTelegramBotsList();
    if (bots.length > 0) {
      const primary = bots.find(b => b.isPrimary && b.isActive) || bots[0];
      if (primary && primary.token) {
        activeToken = primary.token;
      }
    }

    if (!activeToken) {
      try {
        const sysDoc = await getDoc(doc(db, 'system_config', 'settings'));
        if (sysDoc.exists()) {
          activeToken = sysDoc.data().primaryBotToken || '';
        }
      } catch (e) {}
    }

    if (!activeToken) {
      return {
        success: false,
        error: 'No active Telegram bot token found. Please configure a Bot in Admin Bot Hub.'
      };
    }

    const payload = JSON.stringify({
      type: 'stars_deposit',
      orderId: params.orderId,
      userId: params.userId,
      usdAmount: params.usdAmount,
      starsAmount: params.starsAmount
    });

    const res = await fetch(`https://api.telegram.org/bot${activeToken}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Crypto Arbitrage Deposit',
        description: `Deposit $${params.usdAmount.toFixed(2)} USD (${params.starsAmount.toLocaleString()} Stars) to balance`,
        payload: payload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: `${params.starsAmount} Stars`, amount: params.starsAmount }]
      })
    });

    const data: TelegramApiResponse<string> = await res.json();
    if (data.ok && data.result) {
      return { success: true, invoiceUrl: data.result };
    } else {
      return { success: false, error: data.description || 'Telegram Bot API rejected XTR invoice creation.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error generating Telegram Stars invoice.' };
  }
}

/**
 * Send Instant Notification to the User when their deposit is credited
 */
export async function notifyUserDepositSuccess(deposit: {
  userId: string;
  telegramId?: number | string | null;
  telegramUsername?: string | null;
  usdAmount: number;
  cryptoAmount?: string;
  coin: string;
  network: string;
  txid?: string;
  orderId?: string;
  sourceBotUsername?: string | null;
}): Promise<boolean> {
  const targetChatId = deposit.telegramId || deposit.userId;
  if (!targetChatId || isNaN(Number(targetChatId))) return false;

  try {
    const bots = await getTelegramBotsList();
    let targetBotToken = '';

    // A. Attempt to find user's source bot
    if (deposit.sourceBotUsername) {
      const cleanSource = deposit.sourceBotUsername.replace('@', '').toLowerCase();
      const matched = bots.find(b => b.botUsername && b.botUsername.toLowerCase() === cleanSource);
      if (matched && matched.token) {
        targetBotToken = matched.token;
      }
    }

    // B. Fallback to Primary or First Bot
    if (!targetBotToken && bots.length > 0) {
      const primary = bots.find(b => b.isPrimary && b.isActive) || bots[0];
      if (primary && primary.token) {
        targetBotToken = primary.token;
      }
    }

    if (!targetBotToken) {
      const sysDoc = await getDoc(doc(db, 'system_config', 'settings'));
      if (sysDoc.exists()) {
        targetBotToken = sysDoc.data().primaryBotToken || '';
      }
    }

    if (!targetBotToken) return false;

    const scannerUrl = getBlockchainScannerUrl(deposit.coin, deposit.network, deposit.txid || '');

    const text = 
      `✅ <b>DEPOSIT CONFIRMED & CREDITED!</b>\n\n` +
      `💵 <b>Amount Credited:</b> <b>+$${deposit.usdAmount.toFixed(2)} USD</b>\n` +
      `🪙 <b>Crypto Asset:</b> ${deposit.cryptoAmount || deposit.usdAmount} ${deposit.coin} (${deposit.network})\n` +
      `🏷️ <b>Order ID:</b> <code>${deposit.orderId || 'N/A'}</code>\n` +
      `⚡ <b>Status:</b> <b>Completed (Settled on Blockchain)</b>\n` +
      (deposit.txid ? `🔗 <b>TxID:</b> <code>${deposit.txid.slice(0, 16)}...${deposit.txid.slice(-8)}</code>\n\n` : '\n') +
      `🎉 <i>Your funds have been deposited to your account. Open the Trading App to start activating arbitrage yield bots!</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🚀 Open Trading App", web_app: { url: getCurrentMiniAppUrl() } }
        ],
        [
          { text: "🔍 View Transaction", url: scannerUrl }
        ]
      ]
    };

    await fetch(`https://api.telegram.org/bot${targetBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });

    return true;
  } catch (err) {
    console.warn('Failed to dispatch user deposit notification:', err);
    return false;
  }
}

/**
 * Send Instant Notification to Referrer when a new user enters with their invite link
 */
export async function notifyReferrerNewInvite(referrerRef: string | number, newUser: {
  id?: string;
  telegramId?: number | string | null;
  telegramUsername?: string | null;
  firstName?: string | null;
  sourceBotUsername?: string | null;
}): Promise<boolean> {
  if (!referrerRef) return false;

  // 1. Try server endpoint first
  try {
    const res = await fetch('/api/referrals/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrerRef, newUser })
    }).then(r => r.json());

    if (res && res.success) return true;
  } catch {}

  // 2. Direct Bot Fallback
  try {
    const bots = await getTelegramBotsList();
    let targetBotToken = '';

    if (newUser.sourceBotUsername) {
      const cleanSource = newUser.sourceBotUsername.replace('@', '').toLowerCase();
      const matched = bots.find(b => b.botUsername && b.botUsername.toLowerCase() === cleanSource);
      if (matched && matched.token) {
        targetBotToken = matched.token;
      }
    }

    if (!targetBotToken && bots.length > 0) {
      const primary = bots.find(b => b.isPrimary && b.isActive) || bots[0];
      if (primary && primary.token) {
        targetBotToken = primary.token;
      }
    }

    if (!targetBotToken) {
      const sysDoc = await getDoc(doc(db, 'system_config', 'settings'));
      if (sysDoc.exists()) {
        targetBotToken = sysDoc.data().primaryBotToken || '';
      }
    }

    if (!targetBotToken) return false;

    const cleanChatId = String(referrerRef).replace(/^ref_/, '').replace(/^tg_/, '').trim();
    if (!cleanChatId || isNaN(Number(cleanChatId))) return false;

    const botUsername = newUser.sourceBotUsername ? newUser.sourceBotUsername.replace('@', '') : 'CryptoArbitrageBot';
    const refLink = `https://t.me/${botUsername}?start=ref_${cleanChatId}`;

    const text = 
      `🎉 <b>NEW REFERRAL JOINED YOUR NETWORK!</b>\n\n` +
      `👤 <b>Trader:</b> ${newUser.firstName || 'Trader'} (@${newUser.telegramUsername || 'N/A'})\n` +
      `🆔 <b>Telegram ID:</b> <code>${newUser.telegramId || newUser.id || 'N/A'}</code>\n` +
      `💰 <b>Commission Tier:</b> 10% Yield Share on all investments\n` +
      `📅 <b>Date:</b> ${new Date().toUTCString()}\n\n` +
      `<i>Your affiliate network is growing! Tap below to invite more traders.</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🚀 Share Invite Link", url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Join the AI Crypto Arbitrage Engine with instant yield settlements!")}` }
        ],
        [
          { text: "📱 Open Mini App", web_app: { url: getCurrentMiniAppUrl() } }
        ]
      ]
    };

    await fetch(`https://api.telegram.org/bot${targetBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });

    return true;
  } catch (err) {
    console.warn('notifyReferrerNewInvite fallback error:', err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// FIRESTORE DATABASE PERSISTENCE FOR BOTS
// -----------------------------------------------------------------------------

export async function getTelegramBotsList(): Promise<TelegramBotConfig[]> {
  let backendHasBots = false;
  try {
    // 1. Try server API
    const serverRes = await fetch('/api/bots').then(r => r.json()).catch(() => null);
    if (serverRes && serverRes.success && Array.isArray(serverRes.bots) && serverRes.bots.length > 0) {
      // Also cache to local
      localStorage.setItem('app_telegram_bots', JSON.stringify(serverRes.bots));
      return serverRes.bots;
    }
  } catch (e) {
    // Ignore server error and fallback to firestore
  }

  let finalBots: TelegramBotConfig[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, 'telegram_bots'));
    const bots: TelegramBotConfig[] = [];
    querySnapshot.forEach((docSnap) => {
      bots.push({ id: docSnap.id, ...docSnap.data() } as TelegramBotConfig);
    });
    if (bots.length > 0) {
      localStorage.setItem('app_telegram_bots', JSON.stringify(bots));
      finalBots = bots.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn('Failed to load telegram bots from Firestore:', err);
  }

  // Fallback to localStorage
  if (finalBots.length === 0) {
    try {
      const local = localStorage.getItem('app_telegram_bots');
      if (local) {
        finalBots = JSON.parse(local);
      }
    } catch {}
  }

  // If backend was empty but we found bots, push them to backend
  if (!backendHasBots && finalBots.length > 0) {
    for (const bot of finalBots) {
      fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: bot.token, autoWebhook: true })
      }).catch(() => {});
    }
  }

  return finalBots;
}

export async function saveTelegramBotConfig(bot: TelegramBotConfig): Promise<void> {
  const botId = String(bot.botId || bot.id);
  
  // 1. Register with backend server API (auto-configures commands, menu button, bio, webhook/polling)
  try {
    await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: bot.token, autoWebhook: true })
    });
  } catch (e) {
    console.warn('Backend server bot registration note:', e);
  }

  // 2. Save to Firestore
  try {
    const docRef = doc(db, 'telegram_bots', botId);
    await setDoc(docRef, { ...bot, id: botId, updatedAt: Date.now() }, { merge: true });

    const cleanUsername = (bot.botUsername || '').replace('@', '');
    await setDoc(doc(db, 'system_config', 'settings'), {
      primaryBotUsername: cleanUsername,
      primaryBotToken: bot.token,
      updatedAt: Date.now()
    }, { merge: true });
    localStorage.setItem('primary_bot_username', cleanUsername);
  } catch (e) {
    console.warn('Failed to write bot config to Firestore:', e);
  }

  // 3. Update local cache
  try {
    const current = await getTelegramBotsList();
    const updated = current.filter(b => b.id !== botId);
    updated.unshift({ ...bot, id: botId });
    localStorage.setItem('app_telegram_bots', JSON.stringify(updated));
  } catch {}
}

export async function deleteTelegramBotConfig(botId: string): Promise<void> {
  try {
    await fetch(`/api/bots/${botId}`, { method: 'DELETE' });
  } catch {}

  try {
    const docRef = doc(db, 'telegram_bots', botId);
    await deleteDoc(docRef);
  } catch {}

  try {
    const current = await getTelegramBotsList();
    const updated = current.filter(b => b.id !== botId);
    localStorage.setItem('app_telegram_bots', JSON.stringify(updated));
  } catch {}
}

/**
 * Instant Hot-Swap / Emergency Failover Replacement for Dedicated Bot
 * Replaces any existing bot, deactivates old webhooks, applies 4-language configuration,
 * and updates system settings in one atomic request.
 */
export async function replaceDedicatedBot(newToken: string): Promise<{ success: boolean; bot?: TelegramBotConfig; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/bots/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newToken: newToken.trim(), baseUrl: getCurrentMiniAppUrl() })
    });
    const data = await res.json();
    if (data.success && data.bot) {
      localStorage.setItem('app_telegram_bots', JSON.stringify([data.bot]));
      if (data.bot.botUsername) {
        localStorage.setItem('primary_bot_username', data.bot.botUsername.replace('@', ''));
      }
      return { success: true, bot: data.bot, message: data.message };
    } else {
      return { success: false, error: data.error || 'Failed to replace bot' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during bot replacement' };
  }
}

// -----------------------------------------------------------------------------
// FAKE LIVE LOAN DISBURSEMENT CHANNEL BROADCAST HELPERS
// -----------------------------------------------------------------------------

export interface ChannelBroadcastSettings {
  loanProofChannelId: string;
  loanProofBotId: string;
  fakeLoanBroadcastEnabled: boolean;
  fakeLoanBroadcastIntervalMinutes: number;
  lastFakeLoanBroadcastAt?: number;
}

export async function triggerChannelFakeLoanBroadcast(params?: {
  channelId?: string;
  botToken?: string;
}): Promise<{ success: boolean; message?: string; error?: string; data?: any }> {
  try {
    const res = await fetch('/api/channel/broadcast-fake-loan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {})
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error broadcasting proof' };
  }
}

export async function getChannelBroadcastSettings(): Promise<{ success: boolean; settings?: ChannelBroadcastSettings; error?: string }> {
  try {
    const res = await fetch('/api/channel/settings');
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching channel settings' };
  }
}

export async function saveChannelBroadcastSettings(settings: Partial<ChannelBroadcastSettings>): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/channel/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error saving channel settings' };
  }
}

// -----------------------------------------------------------------------------
// BOT CODE GENERATOR (Lending & Swap Platform Node.js Bot with In-Place Edits)
// -----------------------------------------------------------------------------

export function generateNodeBotScript(
  bot: TelegramBotConfig, 
  miniAppUrl: string, 
  adminTelegramId = ''
): string {
  const cleanAdminId = (adminTelegramId || '').trim();
  const cleanAppUrl = miniAppUrl.replace(/\/+$/, '');

  return `/**
 * ============================================================================
 * 🏛️ ARBIX CRYPTO LENDING & SWAP TELEGRAM BOT (NODE.JS / GRAMMY)
 * ============================================================================
 * Bot Username: @${bot.botUsername || 'YourBot'}
 * WebApp URL:   ${cleanAppUrl}
 * 
 * CORE FEATURES:
 * • Instant 120% Overcollateralized Loan Calculator ($120 collateral per $100 USDT)
 * • Decentralized Multi-Chain Token Swaps (USDT, TON, BTC, ETH, SOL)
 * • 4-Language Auto-Detection & In-Chat Switcher (English, Persian, Russian, Chinese)
 * • IN-PLACE Message Editing: Zero chat clutter or spam on button clicks
 * • Always-present "Back to Main Menu" Navigation Button
 * • Real-time Referral Deep Linking & Admin Alerts
 * 
 * HOW TO RUN:
 * 1. mkdir arbix-bot && cd arbix-bot
 * 2. npm init -y && npm install grammy
 * 3. Save as \`bot.js\` and run: node bot.js
 * ============================================================================
 */

const { Bot, InlineKeyboard } = require("grammy");

const BOT_TOKEN = "${bot.token || 'YOUR_TELEGRAM_BOT_TOKEN'}";
const MINI_APP_URL = "${cleanAppUrl}";
const BOT_USERNAME = "${bot.botUsername || 'YourBot'}";
const ADMIN_TELEGRAM_ID = "${cleanAdminId}";

const bot = new Bot(BOT_TOKEN);

function resolveBotLang(code) {
  if (!code) return "en";
  const c = String(code).toLowerCase().trim();
  if (c.startsWith("fa") || c.startsWith("per") || c === "farsi") return "fa";
  if (c.startsWith("ru")) return "ru";
  if (c.startsWith("zh") || c.startsWith("cn")) return "zh";
  return "en";
}

const BOT_I18N = {
  en: {
    welcome: (name, bonus, refNote) =>
      \`🏛️ <b>Welcome to Arbix Crypto Lending & Swap, \${name}!</b>\\n\\n\` +
      \`Instant overcollateralized loans & decentralized token swaps.\\n\\n\` +
      \`⚡ <b>Instant Loans:</b> 120% collateral ($120 pledge ➔ $100 USDT), 1.8% fixed fee, 30-day term.\\n\` +
      \`🔄 <b>Multi-Chain Swap:</b> Zero-slippage swaps across USDT, TON, BTC, ETH, SOL.\\n\` +
      \`🎁 <b>$\${bonus} Starter Credit</b> is active in your account.\\n\\n\` +
      refNote +
      \`Choose an option below:\`,
    launchBtn: "🚀 Open Lending & Swap App",
    loansBtn: "🏛️ Instant Loans (120% Collateral)",
    swapBtn: "🔄 Multi-Chain Token Swap",
    refBtn: "👥 Referral Program (10%)",
    supportBtn: "💬 Official Support (@ai_zke)",
    helpBtn: "ℹ️ Protocol Guide",
    langBtn: "🌐 Language / زبان",
    backBtn: "🔙 Back to Main Menu",
    loansText:
      \`🏛️ <b>INSTANT CRYPTO CREDIT FACILITY:</b>\\n\\n\` +
      \`Borrow USDT against crypto collateral with zero credit checks.\\n\\n\` +
      \`⚡ <b>Terms & Parameters:</b>\\n\` +
      \`• Collateral Ratio: <b>120%</b> ($120 collateral per $100 loan)\\n\` +
      \`• Origination Fee: <b>1.8% Fixed</b>\\n\` +
      \`• Term: <b>30 Days</b> (Renewable)\\n\` +
      \`• Collateral: <b>100% Refundable</b> upon loan settlement.\\n\\n\` +
      \`<i>Tap below to claim your loan in the WebApp:</i>\`,
    swapText:
      \`🔄 <b>DECENTRALIZED MULTI-CHAIN SWAP:</b>\\n\\n\` +
      \`Instant zero-slippage swaps between USDT, TON, BTC, ETH, and SOL.\\n\\n\` +
      \`<i>Tap below to launch the swap terminal:</i>\`,
    refText: (link) =>
      \`👥 <b>AFFILIATE & REFERRAL PROGRAM:</b>\\n\\n\` +
      \`Earn <b>10% instant commission</b> on all loans, swaps, and deposits from your invited network.\\n\\n\` +
      \`🔗 <b>Your Referral Link:</b>\\n<code>\${link}</code>\`,
    helpText:
      \`ℹ️ <b>QUICK START GUIDE:</b>\\n\\n\` +
      \`1. Open Mini App & verify your account.\\n\` +
      \`2. Deposit 120% collateral (e.g. $120) to receive instant $100 USDT loan.\\n\` +
      \`3. Use the Multi-Chain Swap to trade tokens at zero slippage.\\n\\n\` +
      \`👤 VIP Support: @ai_zke\`,
    shareMsg: "🚀 Claim your instant crypto loan & $5 bonus on Arbix!"
  },
  fa: {
    welcome: (name, bonus, refNote) =>
      \`🏛️ <b>به پلتفرم وام‌دهی و سواپ Arbix خوش آمدید، \${name}!</b>\\n\\n\` +
      \`دسترسی آنی به تسهیلات اعتباری با وثیقه ۱۲۰٪ و سواپ فوق‌سریع ارزها.\\n\\n\` +
      \`⚡ <b>وام فوری بدون ضامن:</b> با ۱۲۰٪ وثیقه، فوراً تتر (USDT) دریافت کنید (کارمزد ۱.۸٪، تسویه ۳۰ روزه).\\n\` +
      \`🔄 <b>سواپ مولتی‌چین:</b> تبدیل سریع بین USDT، TON، BTC، ETH و SOL.\\n\` +
      \`🎁 <b>$\${bonus} پاداش اولیه</b> در حساب شما فعال است.\\n\\n\` +
      refNote +
      \`یک گزینه را انتخاب کنید:\`,
    launchBtn: "🚀 ورود به مینی‌اپ وام و سواپ",
    loansBtn: "🏛️ دریافت وام فوری (۱۲۰٪ وثیقه)",
    swapBtn: "🔄 سواپ آنی رمزارزها",
    refBtn: "👥 کسب درآمد و زیرمجموعه‌گیری (۱۰٪)",
    supportBtn: "💬 پشتیبانی رسمی (@ai_zke)",
    helpBtn: "ℹ️ راهنمای پلتفرم",
    langBtn: "🌐 تغییر زبان (Language)",
    backBtn: "🔙 بازگشت به منوی اصلی",
    loansText:
      \`🏛️ <b>تسهیلات اعتباری و وام فوری:</b>\\n\\n\` +
      \`دریافت فوری تتر با تودیع وثیقه بدون نیاز به چک و ضامن.\\n\\n\` +
      \`⚡ <b>شرایط وام:</b>\\n\` +
      \`• نسبت وثیقه: <b>۱۲۰٪</b> (مثلاً ۱۲۰ دلار وثیقه برای دریافت ۱۰۰ دلار وام)\\n\` +
      \`• کارمزد ایجاد وام: <b>۱.۸٪ ثابت</b>\\n\` +
      \`• دوره بازپرداخت: <b>۳۰ روز</b> (قابل تمدید)\\n\` +
      \`• وثیقه: <b>۱۰۰٪ قابل بازگشت</b> بلافاصله پس از تسویه.\\n\\n\` +
      \`<i>برای محاسبه و دریافت وام روی دکمه زیر کلیک کنید:</i>\`,
    swapText:
      \`🔄 <b>سواپ غیرمتمرکز مولتی‌چین:</b>\\n\\n\` +
      \`تبدیل فوق‌سریع بین شبکه‌های TRC20، BEP20، TON، BTC و ETH با کمترین کارمزد شبکه.\\n\\n\` +
      \`<i>برای ورود به بخش سواپ روی دکمه زیر کلیک کنید:</i>\`,
    refText: (link) =>
      \`👥 <b>برنامه همکاری و رفرال:</b>\\n\\n\` +
      \`دریافت <b>۱۰٪ کمیسیون آنی</b> از تمامی وام‌ها، سواپ‌ها و واریزی‌های کاربران شما.\\n\\n\` +
      \`🔗 <b>لینک اختصاصی دعوت شما:</b>\\n<code>\${link}</code>\`,
    helpText:
      \`ℹ️ <b>راهنمای سریع:</b>\\n\\n\` +
      \`۱. مینی‌اپ را باز کرده و احراز هویت اولیه را انجام دهید.\\n\` +
      \`۲. مبلغ وام را انتخاب و ۱۲۰٪ وثیقه واریز کنید تا وام فوراً واریز شود.\\n\` +
      \`۳. از بخش سواپ برای تبدیل آسان رمزارزها استفاده نمایید.\\n\\n\` +
      \`👤 پشتیبانی VIP: @ai_zke\`,
    shareMsg: "🚀 وام فوری کریپتو بدون ضامن و ۵ دلار پاداش در Arbix!"
  }
};

// Setup Bot Commands & WebApp Launcher
async function setupBot() {
  try {
    await bot.api.setMyCommands([
      { command: "start", description: "🚀 Open Lending & Swap App" },
      { command: "loans", description: "🏛️ Instant Crypto Loans (120% Collateral)" },
      { command: "swap", description: "🔄 Multi-Chain Token Swap" },
      { command: "referral", description: "👥 Referral Program & Link" },
      { command: "support", description: "💬 Support (@ai_zke)" }
    ]);

    await bot.api.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "⚡ Open Lending App",
        web_app: { url: MINI_APP_URL }
      }
    });

    console.log("✅ Bot commands and WebApp launcher configured successfully!");
  } catch (err) {
    console.warn("⚠️ Setup note:", err.message);
  }
}

// Main Menu Keyboard Builder
function buildMainMenuKeyboard(userId, lang, appUrl) {
  const strings = BOT_I18N[lang] || BOT_I18N.en;
  const launchUrl = appUrl + (appUrl.includes("?") ? "&" : "?") + "lang=" + lang;

  return new InlineKeyboard()
    .webApp(strings.launchBtn, launchUrl)
    .row()
    .text(strings.loansBtn, "cmd_loans")
    .text(strings.swapBtn, "cmd_swap")
    .row()
    .text(strings.refBtn, \`cmd_ref_\${userId}\`)
    .text(strings.langBtn, "cmd_lang")
    .row()
    .text(strings.helpBtn, "cmd_help")
    .url(strings.supportBtn, "https://t.me/ai_zke");
}

// /start Command Handler
bot.command("start", async (ctx) => {
  const startPayload = (ctx.match || "").trim();
  const user = ctx.from;
  const firstName = user?.first_name || "Trader";
  const userId = user?.id;
  const userLang = resolveBotLang(user?.language_code);
  const strings = BOT_I18N[userLang] || BOT_I18N.en;

  const refNote = startPayload
    ? \`🎯 <i>\${userLang === 'fa' ? 'کد معرف:' : 'Referred by:'} <code>\${startPayload}</code></i>\\n\\n\`
    : "";

  const keyboard = buildMainMenuKeyboard(userId, userLang, MINI_APP_URL);
  const text = strings.welcome(firstName, "5.00", refNote);

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: keyboard
  });
});

// Interactive Callback Query Router (In-Place Edit to Prevent Spam)
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const user = ctx.from;
  const userId = user.id;
  const firstName = user.first_name || "Trader";
  const userLang = resolveBotLang(user.language_code);
  const strings = BOT_I18N[userLang] || BOT_I18N.en;
  const launchUrl = MINI_APP_URL + (MINI_APP_URL.includes("?") ? "&" : "?") + "lang=" + userLang;

  await ctx.answerCallbackQuery();

  if (data === "cmd_main_menu") {
    const text = strings.welcome(firstName, "5.00", "");
    const keyboard = buildMainMenuKeyboard(userId, userLang, MINI_APP_URL);
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } else if (data === "cmd_loans") {
    const loansUrl = launchUrl + "&route=loans";
    const keyboard = new InlineKeyboard()
      .webApp(strings.loansBtn, loansUrl)
      .row()
      .text(strings.backBtn, "cmd_main_menu");

    await ctx.editMessageText(strings.loansText, { parse_mode: "HTML", reply_markup: keyboard });
  } else if (data === "cmd_swap") {
    const swapUrl = launchUrl + "&route=earn";
    const keyboard = new InlineKeyboard()
      .webApp(strings.swapBtn, swapUrl)
      .row()
      .text(strings.backBtn, "cmd_main_menu");

    await ctx.editMessageText(strings.swapText, { parse_mode: "HTML", reply_markup: keyboard });
  } else if (data.startsWith("cmd_ref")) {
    const refLink = \`https://t.me/\${BOT_USERNAME}?start=ref_\${userId}\`;
    const keyboard = new InlineKeyboard()
      .webApp(strings.launchBtn, launchUrl)
      .row()
      .url("📤 Share Invite Link", \`https://t.me/share/url?url=\${encodeURIComponent(refLink)}&text=\${encodeURIComponent(strings.shareMsg)}\`)
      .row()
      .text(strings.backBtn, "cmd_main_menu");

    await ctx.editMessageText(strings.refText(refLink), { parse_mode: "HTML", reply_markup: keyboard });
  } else if (data === "cmd_help") {
    const keyboard = new InlineKeyboard()
      .url(strings.supportBtn, "https://t.me/ai_zke")
      .row()
      .text(strings.backBtn, "cmd_main_menu");

    await ctx.editMessageText(strings.helpText, { parse_mode: "HTML", reply_markup: keyboard });
  }
});

async function main() {
  console.log("⚡ Starting Arbix Crypto Lending & Swap Bot @\${BOT_USERNAME}...");
  await setupBot();
  await bot.start();
}

main().catch(console.error);
`;
}

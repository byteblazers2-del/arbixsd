import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Globe, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Code2, 
  Download, 
  Send, 
  Star, 
  Terminal, 
  Share2,
  Radio,
  Megaphone
} from 'lucide-react';
import { TelegramBotConfig } from '../types';
import { 
  fetchTelegramBotInfo, 
  fetchTelegramWebhookInfo, 
  setTelegramBotWebhook, 
  deleteTelegramBotWebhook, 
  setTelegramBotMenuButton, 
  setTelegramBotCommands, 
  setTelegramBotDescription,
  setTelegramBotShortDescription,
  sendTelegramTestMessage, 
  getCurrentMiniAppUrl, 
  getTelegramBotsList, 
  saveTelegramBotConfig, 
  deleteTelegramBotConfig,
  replaceDedicatedBot,
  generateNodeBotScript,
  notifyAdminDepositAlert,
  triggerChannelFakeLoanBroadcast,
  getChannelBroadcastSettings,
  saveChannelBroadcastSettings
} from '../services/telegramBotService';
import { getSystemSettings, saveSystemSettings } from '../services/systemService';

interface AdminBotsHubProps {
  adminTelegramId?: string | number;
}

export function AdminBotsHub({ adminTelegramId = '' }: AdminBotsHubProps) {
  const [bots, setBots] = useState<TelegramBotConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDomain, setActiveDomain] = useState<string>('');
  const [customDomainInput, setCustomDomainInput] = useState<string>('');
  const [isEditingDomain, setIsEditingDomain] = useState<boolean>(false);

  // New Bot Form State
  const [newToken, setNewToken] = useState<string>('');
  const [isVerifyingToken, setIsVerifyingToken] = useState<boolean>(false);
  const [tokenVerificationResult, setTokenVerificationResult] = useState<any>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isAutoConfiguring, setIsAutoConfiguring] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Bot Code Generator State
  const [selectedBotForCode, setSelectedBotForCode] = useState<TelegramBotConfig | null>(null);
  const [customAdminId, setCustomAdminId] = useState<string>(String(adminTelegramId || ''));
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Test Message Modal State
  const [testModalBot, setTestModalBot] = useState<TelegramBotConfig | null>(null);
  const [testChatId, setTestChatId] = useState<string>(String(adminTelegramId || ''));
  const [testMessageText, setTestMessageText] = useState<string>('🚀 Hello from your Arbix Crypto Lending & Swap platform! Telegram integration is fully working.');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);

  // Referral Link Tester
  const [testerTgId, setTesterTgId] = useState<string>(String(adminTelegramId || '12345678'));
  const [copiedRefLink, setCopiedRefLink] = useState<boolean>(false);

  // Admin Channel Configuration State
  const [adminChannelInput, setAdminChannelInput] = useState<string>('');
  const [selectedChannelBotId, setSelectedChannelBotId] = useState<string>('primary');
  const [isSavingChannel, setIsSavingChannel] = useState<boolean>(false);
  const [isSendingChannelTest, setIsSendingChannelTest] = useState<boolean>(false);

  // Fake Loan Proof Broadcast Channel State
  const [loanProofChannelInput, setLoanProofChannelInput] = useState<string>('');
  const [loanProofBotId, setLoanProofBotId] = useState<string>('primary');
  const [isAutoProofEnabled, setIsAutoProofEnabled] = useState<boolean>(true);
  const [proofIntervalMinutes, setProofIntervalMinutes] = useState<number>(30);
  const [isSavingProofSettings, setIsSavingProofSettings] = useState<boolean>(false);
  const [isBroadcastingInstantProof, setIsBroadcastingInstantProof] = useState<boolean>(false);
  const [previewImageKey, setPreviewImageKey] = useState<number>(Date.now());
  const [proofBroadcastSuccess, setProofBroadcastSuccess] = useState<string | null>(null);

  useEffect(() => {
    const currentUrl = getCurrentMiniAppUrl();
    setActiveDomain(currentUrl);
    setCustomDomainInput(currentUrl);
    loadBots();

    getSystemSettings().then(settings => {
      if (settings.adminChannelId) {
        setAdminChannelInput(settings.adminChannelId);
      }
      if (settings.channelAlertBotId) {
        setSelectedChannelBotId(settings.channelAlertBotId);
      }
    });

    getChannelBroadcastSettings().then(res => {
      if (res.success && res.settings) {
        setLoanProofChannelInput(res.settings.loanProofChannelId || '');
        setLoanProofBotId(res.settings.loanProofBotId || 'primary');
        setIsAutoProofEnabled(res.settings.fakeLoanBroadcastEnabled ?? true);
        setProofIntervalMinutes(res.settings.fakeLoanBroadcastIntervalMinutes || 30);
      }
    });
  }, []);

  useEffect(() => {
    if (adminTelegramId && !customAdminId) {
      setCustomAdminId(String(adminTelegramId));
      setTestChatId(String(adminTelegramId));
      setTesterTgId(String(adminTelegramId));
    }
  }, [adminTelegramId]);

  const loadBots = async () => {
    setLoading(true);
    try {
      const list = await getTelegramBotsList();
      setBots(list);
      if (list.length > 0 && !selectedBotForCode) {
        setSelectedBotForCode(list[0]);
      }
    } catch (e) {
      console.warn("Failed to load bots:", e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Verify Bot Token against Telegram API
  const handleVerifyToken = async (tokenToTest = newToken) => {
    const cleanToken = tokenToTest.trim();
    if (!cleanToken) {
      setVerificationError('Please enter a valid Telegram Bot Token from @BotFather.');
      return;
    }

    setIsVerifyingToken(true);
    setVerificationError(null);
    setTokenVerificationResult(null);

    const res = await fetchTelegramBotInfo(cleanToken);
    setIsVerifyingToken(false);

    if (res.success && res.data) {
      setTokenVerificationResult(res.data);
      setVerificationError(null);
    } else {
      setVerificationError(res.error || 'Failed to verify token with Telegram.');
      setTokenVerificationResult(null);
    }
  };

  // 2. Auto-configure Webhook + Menu Button + Save
  const handleAutoConfigureAndSave = async () => {
    const cleanToken = newToken.trim();
    if (!cleanToken) {
      setVerificationError('Please enter the bot token received from @BotFather.');
      return;
    }

    setIsAutoConfiguring(true);
    setVerificationError(null);

    try {
      // Step A: Call Server Bot Registration
      const serverRes = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken, autoWebhook: true })
      }).then(r => r.json());

      if (!serverRes.success) {
        throw new Error(serverRes.error || 'Connection to Telegram failed.');
      }

      const botItem = serverRes.bot;

      // Save to local & Firestore as well
      await saveTelegramBotConfig(botItem);
      await loadBots();

      setSelectedBotForCode(botItem);
      setNewToken('');
      setTokenVerificationResult(null);
      setActionSuccessMessage(`🎉 Bot @${botItem.botUsername} connected successfully and ready on Telegram!`);

      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err: any) {
      setVerificationError(err.message || 'Error auto-configuring bot.');
    } finally {
      setIsAutoConfiguring(false);
    }
  };

  // Emergency Failover / Replace Dedicated Bot
  const handleFailoverReplaceBot = async () => {
    const cleanToken = newToken.trim();
    if (!cleanToken) {
      setVerificationError('Please enter the new bot token received from @BotFather.');
      return;
    }

    if (!confirm('Are you sure you want to replace the current bot with this new bot? All webhooks, menu buttons, and multilingual commands (English, Russian, Chinese) will shift to the new bot.')) {
      return;
    }

    setIsAutoConfiguring(true);
    setVerificationError(null);

    try {
      const res = await replaceDedicatedBot(cleanToken);
      if (!res.success || !res.bot) {
        throw new Error(res.error || 'Emergency failover replacement failed.');
      }

      await loadBots();
      setSelectedBotForCode(res.bot);
      setNewToken('');
      setTokenVerificationResult(null);
      setActionSuccessMessage(`🚀 Failover successful! New bot @${res.bot.botUsername} is active with localized commands configured.`);
      setTimeout(() => setActionSuccessMessage(null), 8000);
    } catch (err: any) {
      setVerificationError(err.message || 'Error replacing bot.');
    } finally {
      setIsAutoConfiguring(false);
    }
  };

  // 3. Set Webhook for existing bot
  const handleSetWebhook = async (bot: TelegramBotConfig) => {
    const targetDomain = activeDomain.trim().replace(/\/+$/, '');
    const webhookUrl = `${targetDomain}/api/telegram-webhook`;

    const res = await setTelegramBotWebhook(bot.token, webhookUrl);
    if (res.success) {
      await saveTelegramBotConfig({
        ...bot,
        webhookUrl: webhookUrl,
        webhookStatus: 'active',
        lastWebhookCheck: Date.now(),
        updatedAt: Date.now()
      });
      await loadBots();
      setActionSuccessMessage(`✅ Webhook set to ${webhookUrl} for @${bot.botUsername}`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } else {
      alert(`Error setting webhook: ${res.error}`);
    }
  };

  // 4. Delete Webhook (For Polling script)
  const handleDeleteWebhook = async (bot: TelegramBotConfig) => {
    const res = await deleteTelegramBotWebhook(bot.token, true);
    if (res.success) {
      await saveTelegramBotConfig({
        ...bot,
        webhookUrl: '',
        webhookStatus: 'not_set',
        lastWebhookCheck: Date.now(),
        updatedAt: Date.now()
      });
      await loadBots();
      setActionSuccessMessage(`🔄 Webhook removed for @${bot.botUsername}. You can now run the Node.js polling script!`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  // 5. Re-set Menu Button with custom title option
  const handleSetMenuButton = async (bot: TelegramBotConfig) => {
    const customTitle = prompt("Enter button text for Telegram Menu Button (or cancel to set manually in @BotFather):", "⚡ Launch App");
    if (!customTitle) return;

    const targetDomain = activeDomain.trim().replace(/\/+$/, '');
    const res = await setTelegramBotMenuButton(bot.token, targetDomain, customTitle, bot.botUsername);
    if (res.success) {
      await saveTelegramBotConfig({
        ...bot,
        menuButtonSet: true,
        updatedAt: Date.now()
      });
      await loadBots();
      setActionSuccessMessage(`📱 Menu Button set to "${customTitle}" for @${bot.botUsername}!`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  // 6. Delete Bot Config
  const handleDeleteBot = async (botId: string, username: string) => {
    if (confirm(`Are you sure you want to remove bot @${username}?`)) {
      await deleteTelegramBotConfig(botId);
      await loadBots();
    }
  };

  // 7. Make Primary Bot
  const handleMakePrimary = async (targetBot: TelegramBotConfig) => {
    for (const b of bots) {
      await saveTelegramBotConfig({
        ...b,
        isPrimary: b.id === targetBot.id
      });
    }
    await saveSystemSettings({
      primaryBotUsername: targetBot.botUsername,
      primaryBotToken: targetBot.token
    });
    await loadBots();
    setActionSuccessMessage(`⭐ Bot @${targetBot.botUsername} is now designated as the Primary Bot!`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // 7.5. Set Bot as Channel Alert Sender
  const handleSetChannelSenderBot = async (targetBot: TelegramBotConfig) => {
    setSelectedChannelBotId(targetBot.botUsername);
    await saveSystemSettings({
      channelAlertBotId: targetBot.botUsername
    });
    setActionSuccessMessage(`📢 Bot @${targetBot.botUsername} is now the dedicated sender for channel alerts!`);
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  // 8. Send Direct Test Message
  const handleSendTestMessage = async () => {
    if (!testModalBot || !testChatId.trim()) {
      setTestResult({ success: false, text: 'Please enter a valid Chat ID.' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    const res = await sendTelegramTestMessage(testModalBot.token, testChatId.trim(), testMessageText);
    setIsSendingTest(false);

    if (res.success) {
      setTestResult({ success: true, text: res.message || 'Message sent!' });
    } else {
      setTestResult({ success: false, text: res.error || 'Failed to send message.' });
    }
  };

  // 9. Save & Test Dedicated Admin Channel Notifications
  const handleSaveAdminChannel = async () => {
    setIsSavingChannel(true);
    try {
      const cleanChannel = adminChannelInput.trim();
      await saveSystemSettings({ 
        adminChannelId: cleanChannel,
        channelAlertBotId: selectedChannelBotId
      });
      setActionSuccessMessage(
        cleanChannel 
          ? `📢 Admin channel (${cleanChannel}) saved! Sender bot: ${selectedChannelBotId === 'primary' ? 'Primary Bot ⭐' : selectedChannelBotId === 'user_origin' ? "User's Origin Bot 🔄" : '@' + selectedChannelBotId}`
          : '📢 Dedicated channel cleared.'
      );
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (e: any) {
      alert("Error saving channel: " + e.message);
    } finally {
      setIsSavingChannel(false);
    }
  };

  const handleTestChannelAlert = async () => {
    if (!adminChannelInput.trim()) {
      alert("Please enter a valid channel ID first (e.g. -1001234567890).");
      return;
    }

    setIsSendingChannelTest(true);
    
    // Determine test bot username
    let testBotUsername = 'CryptoArbitrageBot';
    if (selectedChannelBotId && selectedChannelBotId !== 'primary' && selectedChannelBotId !== 'user_origin') {
      testBotUsername = selectedChannelBotId.replace('@', '');
    } else {
      const primary = bots.find(b => b.isPrimary) || bots[0];
      if (primary) testBotUsername = primary.botUsername;
    }

    const testDep = {
      orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: String(adminTelegramId || '5951882585'),
      telegramUsername: 'ai_zke',
      telegramId: adminTelegramId || '5951882585',
      usdAmount: 350.00,
      cryptoAmount: '350.00',
      coin: 'USDT',
      network: 'TRC20',
      depositAddress: 'T9xCryptoArbitrageAdminWalletAddressExample',
      txid: 'd9a8b7c6e5f4d3c2b1a0987654321fedcba9876543210987654321abcdef0123',
      status: 'pending',
      fromBot: true,
      botName: 'Flash Loan Strategy #1',
      sourceBotUsername: testBotUsername
    };

    const ok = await notifyAdminDepositAlert(testDep);
    setIsSendingChannelTest(false);

    if (ok) {
      setActionSuccessMessage(`✅ Deposit alert test sent to dedicated channel via @${testBotUsername}!`);
      setTimeout(() => setActionSuccessMessage(null), 7000);
    } else {
      alert(`⚠️ Delivery to channel failed. Ensure @${testBotUsername} is an admin in the channel with post permissions.`);
    }
  };

  // Save Loan Proof Social Channel Settings
  const handleSaveLoanProofSettings = async () => {
    setIsSavingProofSettings(true);
    try {
      const res = await saveChannelBroadcastSettings({
        loanProofChannelId: loanProofChannelInput.trim(),
        loanProofBotId: loanProofBotId.trim(),
        fakeLoanBroadcastEnabled: isAutoProofEnabled,
        fakeLoanBroadcastIntervalMinutes: Number(proofIntervalMinutes) || 30
      });

      if (res.success) {
        setActionSuccessMessage("🎉 تنظیمات کانال گزارش واریز وام با موفقیت ذخیره شد! (Channel Settings Saved)");
        setTimeout(() => setActionSuccessMessage(null), 6000);
      } else {
        alert(res.error || "خطا در ذخیره تنظیمات کانال");
      }
    } catch (e: any) {
      alert(e.message || "خطای ارتباط با سرور");
    } finally {
      setIsSavingProofSettings(false);
    }
  };

  // Trigger Instant 4K Fake Loan Proof Broadcast to Channel
  const handleTriggerInstantProofBroadcast = async () => {
    if (!loanProofChannelInput.trim()) {
      alert("لطفاً ابتدا آیدی یا یوزرنیم کانال تلگرام را وارد کنید (مثال: @MyChannel یا -100xxxx).");
      return;
    }

    setIsBroadcastingInstantProof(true);
    setProofBroadcastSuccess(null);
    try {
      const res = await triggerChannelFakeLoanBroadcast({
        channelId: loanProofChannelInput.trim()
      });

      if (res.success && res.data) {
        setProofBroadcastSuccess(`✅ گزارش وام +$${res.data.loanAmount} USDT همراه با تصویر باکیفیت 4K با موفقیت به کانال ارسال شد!`);
        setPreviewImageKey(Date.now());
        setTimeout(() => setProofBroadcastSuccess(null), 8000);
      } else {
        alert(`⚠️ ارسال به کانال ناموفق بود: ${res.error}\n\nاطمینان حاصل کنید ربات انتخابی در کانال ادمین با دسترسی ارسال پیام (Post Messages) است.`);
      }
    } catch (e: any) {
      alert(e.message || "خطای ارسال به کانال");
    } finally {
      setIsBroadcastingInstantProof(false);
    }
  };

  const getGeneratedJsCode = (bot: TelegramBotConfig | null): string => {
    if (!bot) return '// Please select or add a bot above to generate code.';
    return generateNodeBotScript(bot, activeDomain, customAdminId.trim());
  };

  const handleCopyCode = () => {
    const code = getGeneratedJsCode(selectedBotForCode);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCode = () => {
    const code = getGeneratedJsCode(selectedBotForCode);
    const fileName = 'bot.js';
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeBot = selectedBotForCode || (bots.length > 0 ? bots[0] : null);
  const sampleRefLink = activeBot ? `https://t.me/${activeBot.botUsername}?start=ref_${testerTgId}` : `https://t.me/CryptoArbitrageBot?start=ref_${testerTgId}`;

  return (
    <div className="space-y-6 text-white">
      {/* 1. Live Domain & Environment Inspector */}
      <div className="bg-[#121214] rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF] shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">Active Mini App Web Domain</h3>
                <span className="px-2 py-0.5 bg-[#007AFF]/15 text-[#007AFF] text-[10px] font-bold rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF]"></span>
                  <span>Google Cloud / HTTPS</span>
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Telegram bot scripts and Webhook routing link directly to this production endpoint.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditingDomain ? (
              <div className="flex items-center space-x-2 bg-black/50 px-3.5 py-2 rounded-2xl">
                <span className="text-xs font-mono text-[#007AFF] font-semibold truncate max-w-[280px] sm:max-w-md">
                  {activeDomain}
                </span>
                <button
                  onClick={() => setIsEditingDomain(true)}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-bold transition-all"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  placeholder="https://your-domain.com"
                  className="bg-black/60 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:-[#007AFF] w-64"
                />
                <button
                  onClick={() => {
                    setActiveDomain(customDomainInput.trim());
                    setIsEditingDomain(false);
                  }}
                  className="px-3 py-1.5 bg-[#007AFF] text-black font-bold rounded-xl text-xs"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingDomain(false)}
                  className="px-2.5 py-1.5 bg-white/10 text-white font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1.5. Dedicated Admin Private Channel Alerts Card */}
      <div className="bg-[#121214] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Central Admin Private Channel (Multi-Bot Deposit Alerts)</h3>
              <p className="text-xs text-white/50">
                Receive comprehensive deposit reports from ALL connected bots directly in your private Telegram channel.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Real-time Alerts</span>
          </span>
        </div>

        <div className="bg-black/40 p-4 rounded-2xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Channel ID Input */}
            <div className="sm:col-span-5 relative">
              <label className="text-[10px] font-semibold text-white/50 block mb-1">📢 Channel / Chat ID</label>
              <input
                type="text"
                value={adminChannelInput}
                onChange={(e) => setAdminChannelInput(e.target.value)}
                placeholder="e.g. -1001928374650 or @MyPrivateArbitrageDesk"
                className="w-full bg-black/60 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Designated Sender Bot Selector */}
            <div className="sm:col-span-4 relative">
              <label className="text-[10px] font-semibold text-white/50 block mb-1">🤖 Sender Bot for Channel</label>
              <select
                value={selectedChannelBotId}
                onChange={(e) => setSelectedChannelBotId(e.target.value)}
                className="w-full bg-black/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="primary">⭐ Active Primary Bot</option>
                <option value="user_origin">🔄 User's Origin Bot (Dynamic)</option>
                {bots.map((b) => (
                  <option key={b.id} value={b.botUsername}>
                    @{b.botUsername} ({b.botName || 'Bot'})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Actions */}
            <div className="sm:col-span-3 flex items-end gap-2">
              <button
                onClick={handleSaveAdminChannel}
                disabled={isSavingChannel}
                className="flex-1 px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-1 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSavingChannel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save</span>
              </button>

              <button
                onClick={handleTestChannelAlert}
                disabled={isSendingChannelTest || !adminChannelInput.trim()}
                className="flex-1 px-3 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 transition-all active:scale-95 disabled:opacity-50"
                title="Send test alert using selected bot"
              >
                {isSendingChannelTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-emerald-400" />}
                <span>🧪 Test</span>
              </button>
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-xl text-[11px] text-white/60 space-y-1">
            <p className="font-semibold text-white/80">💡 How to setup private Telegram channel alerts:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-white/50 text-[10.5px]">
              <li>Create a Private Channel or Group in Telegram.</li>
              <li>Add your connected Telegram Bot(s) to the channel and promote as <b>Admin</b> (with "Post Messages" permission).</li>
              <li>Forward a message from your channel to <code className="text-emerald-400">@userinfobot</code> or <code className="text-emerald-400">@raw_data_bot</code> to copy the Channel ID (usually starts with <code className="text-emerald-400">-100...</code>).</li>
              <li>Select which bot will broadcast reports (e.g. <b>@Bot1</b> or <b>Primary Bot</b>) and tap <b>Save</b>.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 1.6. Social Proof Channel: Automated Live Fake Loan Payouts (4K High-Res Receipt Certificates) */}
      <div className="bg-[#121214] rounded-2xl p-6 relative overflow-hidden border border-cyan-500/20 shadow-xl shadow-cyan-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">📢 کانال تلگرام اعلانات پرداخت وام (گزارشات واریزی ۴K)</h3>
                <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-400 text-[10px] font-bold rounded-full">
                  4K Live Loan Proofs
                </span>
              </div>
              <p className="text-xs text-white/50">
                ارسال خودکار و دستی تراکنش‌های موفق پرداخت وام با تصاویر مدرن و رزولوشن 4K/2K تولیدشده در Node.js جهت ایجاد اعتماد حداکثری
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTriggerInstantProofBroadcast}
              disabled={isBroadcastingInstantProof || !loanProofChannelInput.trim()}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-900/30"
            >
              {isBroadcastingInstantProof ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
              <span>⚡ ارسال فوری گزارش ۴K به کانال</span>
            </button>
          </div>
        </div>

        {proofBroadcastSuccess && (
          <div className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 p-3.5 rounded-2xl text-xs font-bold mb-4 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>{proofBroadcastSuccess}</span>
            </div>
            <button onClick={() => setProofBroadcastSuccess(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        )}

        <div className="bg-black/40 p-4 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Channel ID Input */}
            <div className="sm:col-span-4">
              <label className="text-[10px] font-semibold text-white/50 block mb-1">📢 آیدی یا یوزرنیم کانال تلگرام (Channel ID)</label>
              <input
                type="text"
                value={loanProofChannelInput}
                onChange={(e) => setLoanProofChannelInput(e.target.value)}
                placeholder="مثال: @MyLoanPayouts یا -100xxxxxxxx"
                className="w-full bg-black/60 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Sender Bot */}
            <div className="sm:col-span-3">
              <label className="text-[10px] font-semibold text-white/50 block mb-1">🤖 ربات ارسال‌کننده (Sender Bot)</label>
              <select
                value={loanProofBotId}
                onChange={(e) => setLoanProofBotId(e.target.value)}
                className="w-full bg-black/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="primary">⭐ ربات اصلی سیستم (Primary Bot)</option>
                {bots.map((b) => (
                  <option key={b.id} value={b.botUsername}>
                    @{b.botUsername} ({b.botName || 'Bot'})
                  </option>
                ))}
              </select>
            </div>

            {/* Interval */}
            <div className="sm:col-span-3">
              <label className="text-[10px] font-semibold text-white/50 block mb-1">⏱ فاصله زمانی ارسال خودکار</label>
              <select
                value={proofIntervalMinutes}
                onChange={(e) => setProofIntervalMinutes(Number(e.target.value))}
                className="w-full bg-black/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                <option value={10}>هر ۱۰ دقیقه (بسیار فعال)</option>
                <option value={15}>هر ۱۵ دقیقه (پیشنهادی)</option>
                <option value={30}>هر ۳۰ دقیقه (استاندارد)</option>
                <option value={60}>هر ۱ ساعت</option>
                <option value={120}>هر ۲ ساعت</option>
              </select>
            </div>

            {/* Save Button */}
            <div className="sm:col-span-2 flex items-end">
              <button
                onClick={handleSaveLoanProofSettings}
                disabled={isSavingProofSettings}
                className="w-full px-3 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-1 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSavingProofSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>ذخیره تنظیمات</span>
              </button>
            </div>
          </div>

          {/* Toggle Auto Broadcast */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center space-x-2.5">
              <span className="text-base">🔄</span>
              <div>
                <span className="text-xs font-bold text-white">فعال‌سازی ارسال خودکار گزارش‌های وام به کانال (Auto-Scheduler)</span>
                <p className="text-[10.5px] text-white/50">در فواصل زمانی انتخاب‌شده، سرور Node.js به‌صورت پس‌زمینه تصویر جدید تولید و در کانال درج می‌کند.</p>
              </div>
            </div>
            <button
              onClick={() => setIsAutoProofEnabled(!isAutoProofEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${isAutoProofEnabled ? 'bg-cyan-500' : 'bg-white/20'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isAutoProofEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* 4K Certificate Live Preview */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span>🖼️ پیش‌نمایش زنده مدرن سند تسویه وام (4K Vector Certificate Preview):</span>
              </span>
              <button
                onClick={() => setPreviewImageKey(Date.now())}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white/80 rounded-lg text-[10.5px] font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>بروزرسانی سند تصادفی</span>
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/80 max-h-[300px] flex items-center justify-center p-2">
              <img
                src={`/api/channel/preview-receipt?t=${previewImageKey}`}
                alt="4K Loan Certificate Preview"
                className="w-full h-auto max-h-[280px] object-contain rounded-xl shadow-2xl"
                onError={(e: any) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <p className="text-[10.5px] text-white/40 mt-1.5 text-center">
              این تصویر باکیفیت 4K توسط پکیج Sharp و موتور وکتور SVG در سرور رندر شده و مستقیم در کانال تلگرام پست می‌شود.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMessage && (
        <div className="bg-[#007AFF]/15 text-[#007AFF] p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#007AFF]" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-white/60 hover:text-white">✕</button>
        </div>
      )}

      {/* 2. Add / Connect / Replace Dedicated Telegram Bot Card */}
      <div className="bg-[#121214] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">Dedicated Bot & Instant Failover Control</h3>
                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-full">
                  Single-Bot Core
                </span>
              </div>
              <p className="text-xs text-white/40">Connect your dedicated primary bot or hot-swap with an emergency backup token if blocked.</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold text-white/60">
            <span>🌐 4-Languages Auto:</span>
            <span className="text-emerald-400 font-bold">EN • RU • ZH • FA</span>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-white/70 block">
            Telegram Bot Token (from <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 underline">@BotFather</a>):
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <input
              type="text"
              value={newToken}
              onChange={(e) => {
                setNewToken(e.target.value);
                setVerificationError(null);
              }}
              placeholder="e.g. 7839218492:AAH9f291KxZ9..."
              className="flex-1 bg-black/60 rounded-2xl px-4 py-3 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
            />
            
            <button
              onClick={() => handleVerifyToken()}
              disabled={isVerifyingToken || !newToken.trim()}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isVerifyingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-sky-400" />}
              <span>Verify</span>
            </button>

            <button
              onClick={handleAutoConfigureAndSave}
              disabled={isAutoConfiguring || !newToken.trim()}
              className="px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
              title="Configure and activate as dedicated bot"
            >
              {isAutoConfiguring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
              <span>⚡ Connect Bot</span>
            </button>

            {bots.length > 0 && (
              <button
                onClick={handleFailoverReplaceBot}
                disabled={isAutoConfiguring || !newToken.trim()}
                className="px-4 py-3 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-rose-900/20"
                title="Immediately terminate old bot and switch to this new backup token"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAutoConfiguring ? 'animate-spin' : ''}`} />
                <span>🔄 Instant Failover</span>
              </button>
            )}
          </div>

          {/* Failover and Language Architecture Note */}
          <div className="bg-sky-500/5 border border-sky-500/10 p-3 rounded-xl flex items-start space-x-2.5 text-[11px] text-white/60">
            <span className="text-base">🛡️</span>
            <div>
              <span className="font-semibold text-white/90">Single-Bot Architecture with Instant Failover:</span>
              <p className="text-[10.5px] text-white/50 mt-0.5 leading-relaxed">
                Commands, greetings, menu buttons, and deposit confirmation messages are automatically localized based on the user's Telegram language (English, Russian, Chinese). If a bot is restricted or experiences issues, user balances and accounts remain 100% intact. Simply paste the new bot token and click <b>Instant Failover</b> to switch the entire system seamlessly in 1 second.
              </p>
            </div>
          </div>

          {/* Verification Feedback Result */}
          {tokenVerificationResult && (
            <div className="bg-sky-500/10 p-4 rounded-2xl mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm">
                  @{tokenVerificationResult.username?.slice(0, 2).toUpperCase() || 'TG'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{tokenVerificationResult.first_name}</span>
                    <span className="text-xs font-mono text-sky-400 font-bold">@{tokenVerificationResult.username}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-white/50">
                    <span>Bot ID: {tokenVerificationResult.id}</span>
                    <span>•</span>
                    <span className="text-[#007AFF]">Token Valid</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAutoConfigureAndSave}
                disabled={isAutoConfiguring}
                className="px-4 py-2 bg-[#007AFF] hover:bg-[#007AFF] text-black text-xs font-bold rounded-xl flex items-center space-x-1.5 active:scale-95 transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Apply to Mini App</span>
              </button>
            </div>
          )}

          {verificationError && (
            <div className="bg-rose-500/10 text-rose-400 p-3 rounded-2xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{verificationError}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Connected Telegram Bots Grid */}
      <div className="bg-[#121214] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <h3 className="text-sm font-bold text-white">Connected Telegram Bots ({bots.length})</h3>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold text-white/60">
              Active Routing
            </span>
          </div>
          <button
            onClick={loadBots}
            className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-colors"
            title="Refresh Bots Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {bots.length === 0 ? (
          <div className="p-8 text-center bg-black/30 rounded-2xl">
            <Bot className="w-10 h-10 mx-auto text-white/20 mb-2" />
            <p className="text-xs font-semibold text-white/60">No Telegram Bots Connected Yet</p>
            <p className="text-[11px] text-white/40 mt-1 max-w-md mx-auto">
              Paste your Bot Token from @BotFather above. You can connect multiple bots simultaneously; each bot will automatically open this Mini App and track referrals!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bots.map((bot) => {
              const isSelected = selectedBotForCode?.id === bot.id;
              return (
                <div 
                  key={bot.id} 
                  className={`bg-black/40 rounded-2xl p-4 transition-all relative ${ bot.isPrimary ? '-amber-500/40 border-amber-500/5' : '-white/10 hover:-white/20' }`}
                >
                  {/* Primary & Channel Sender Badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {bot.isPrimary && (
                      <div className="flex items-center space-x-1 bg-amber-500/15 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Primary</span>
                      </div>
                    )}
                    {(selectedChannelBotId === bot.botUsername || selectedChannelBotId === bot.id) && (
                      <div className="flex items-center space-x-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Megaphone className="w-3 h-3" />
                        <span>Channel Sender</span>
                      </div>
                    )}
                  </div>

                  {/* Header */}
                  <div className="flex items-start space-x-3 pr-20">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 flex items-center justify-center text-sky-400 font-bold shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{bot.botName}</h4>
                      <a 
                        href={`https://t.me/${bot.botUsername}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-mono text-sky-400 hover:underline flex items-center space-x-1"
                      >
                        <span>@{bot.botUsername}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Badges and details */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-[11px]">
                    <div className="bg-white/5 p-2 rounded-xl">
                      <span className="text-white/40 block text-[10px]">Webhook Status</span>
                      <span className={`font-bold flex items-center space-x-1 ${bot.webhookUrl ? 'text-[#007AFF]' : 'text-amber-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${bot.webhookUrl ? 'bg-[#007AFF]' : 'bg-amber-400'}`}></span>
                        <span>{bot.webhookUrl ? 'Webhook Set' : 'Polling Ready'}</span>
                      </span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-xl">
                      <span className="text-white/40 block text-[10px]">Menu Button</span>
                      <span className={`font-bold flex items-center space-x-1 ${bot.menuButtonSet ? 'text-[#007AFF]' : 'text-white/40'}`}>
                        <Check className="w-3 h-3 text-[#007AFF]" />
                        <span>{bot.menuButtonSet ? 'Configured' : 'Default'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Multilingual Commands Badge */}
                  <div className="bg-white/5 p-2 rounded-xl mb-3 flex items-center justify-between text-[11px]">
                    <span className="text-white/40 text-[10px]">Telegram Auto-Lang:</span>
                    <span className="text-emerald-400 font-semibold text-[10.5px]">
                      🇬🇧 EN • 🇷🇺 RU • 🇨🇳 ZH • 🇮🇷 FA
                    </span>
                  </div>

                  {/* Token & BotFather WebApp URL Preview */}
                  <div className="space-y-1.5 mb-3">
                    <div className="bg-black/60 p-2 rounded-xl flex items-center justify-between text-[11px] font-mono text-white/50">
                      <span className="truncate mr-2">Token: {bot.token.slice(0, 8)}...{bot.token.slice(-6)}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(bot.token);
                          alert("Token copied to clipboard!");
                        }}
                        className="text-white/70 hover:text-white shrink-0"
                        title="Copy Token"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="bg-black/60 p-2 rounded-xl flex items-center justify-between text-[11px] font-mono text-sky-400">
                      <span className="truncate mr-2">BotFather URL: {activeDomain}?bot={bot.botUsername}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${activeDomain}?bot=${bot.botUsername}`);
                          alert("BotFather WebApp URL copied to clipboard! Paste this into @BotFather when setting up your Mini App Menu Button.");
                        }}
                        className="text-white/70 hover:text-white shrink-0"
                        title="Copy WebApp URL for @BotFather"
                      >
                        <Copy className="w-3 h-3 text-sky-400" />
                      </button>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-[#1C2632]">
                    <button
                      onClick={() => handleSetMenuButton(bot)}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold transition-colors text-center"
                      title="Register Mini App launcher button in Telegram"
                    >
                      📱 Set Menu
                    </button>

                    <button
                      onClick={() => handleSetWebhook(bot)}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold transition-colors text-center"
                      title="Configure Webhook to current domain"
                    >
                      ⚡ Set Webhook
                    </button>

                    <button
                      onClick={() => handleDeleteWebhook(bot)}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-amber-300 rounded-lg text-[10px] font-bold transition-colors text-center"
                      title="Clear Webhook so you can run node polling bot"
                    >
                      🔄 Polling Mode
                    </button>

                    <button
                      onClick={() => {
                        setTestModalBot(bot);
                        setTestResult(null);
                      }}
                      className="px-2 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg text-[10px] font-bold transition-colors text-center"
                    >
                      💬 Test Ping
                    </button>
                  </div>

                  {/* Secondary footer actions */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1C2632] text-[11px]">
                    <button
                      onClick={() => setSelectedBotForCode(bot)}
                      className={`text-xs font-bold flex items-center space-x-1 ${ isSelected ? 'text-sky-400' : 'text-white/60 hover:text-white' }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Code Selected' : 'View JS Code'}</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {selectedChannelBotId !== bot.botUsername && selectedChannelBotId !== bot.id && (
                        <button
                          onClick={() => handleSetChannelSenderBot(bot)}
                          className="text-[10px] text-emerald-400/80 hover:text-emerald-400 font-bold flex items-center space-x-0.5"
                          title="Set this bot as the broadcaster for Channel alerts"
                        >
                          <Megaphone className="w-2.5 h-2.5" />
                          <span>Channel Sender</span>
                        </button>
                      )}
                      {!bot.isPrimary && (
                        <button
                          onClick={() => handleMakePrimary(bot)}
                          className="text-[10px] text-amber-400/80 hover:text-amber-400 font-bold"
                        >
                          Make Primary
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteBot(bot.id, bot.botUsername)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="Remove Bot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Ready-to-Paste JavaScript / Node.js Bot Code */}
      <div className="bg-[#121214] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                JavaScript (Node.js) Ready Bot Script
                {activeBot ? ` — @${activeBot.botUsername}` : ''}
              </h3>
              <p className="text-xs text-white/40">
                Paste directly into any Google Cloud Run container, VPS or server. High speed, referral support, zero lag.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-[11px] text-white/60 font-semibold whitespace-nowrap">Admin Telegram ID:</label>
            <input
              type="text"
              value={customAdminId}
              onChange={(e) => setCustomAdminId(e.target.value)}
              placeholder="e.g. 548670437"
              className="bg-black/60 rounded-xl px-3 py-1 text-xs font-mono text-white focus:outline-none focus:-amber-400 w-36"
            />
          </div>
        </div>

        {/* Code Container */}
        <div className="relative">
          <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
            <button
              onClick={handleCopyCode}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 backdrop-blur-md transition-all active:scale-95"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-[#007AFF]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied JS Code!' : 'Copy JS Code'}</span>
            </button>

            <button
              onClick={handleDownloadCode}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download bot.js</span>
            </button>
          </div>

          <pre className="bg-black/90 p-4 pt-12 rounded-2xl font-mono text-xs text-[#007AFF] overflow-x-auto max-h-[380px] leading-relaxed select-all">
            {getGeneratedJsCode(activeBot)}
          </pre>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-4 bg-white/5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-white/70">
          <div>
            <span className="font-bold text-white block mb-1">1. Install Node Dependency</span>
            <code className="font-mono bg-black/60 px-2 py-1 rounded text-[#007AFF] text-[11px] block">
              npm install grammy
            </code>
          </div>
          <div>
            <span className="font-bold text-white block mb-1">2. Run in Cloud / VPS</span>
            <code className="font-mono bg-black/60 px-2 py-1 rounded text-sky-300 text-[11px] block">
              node bot.js
            </code>
          </div>
          <div>
            <span className="font-bold text-white block mb-1">3. Automated Referral Tracking</span>
            <p className="text-[11px] text-white/50">
              Users launching via <code>?start=ref_123</code> are registered instantly to the inviter.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Referral Link Tester */}
      <div className="bg-[#121214] rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Referral Deep-Link Tester</h3>
            <p className="text-xs text-white/40">
              Simulate invite links for any Telegram User ID to test direct Mini App onboarding and commission tracking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1.5">
              Inviter Telegram ID:
            </label>
            <input
              type="text"
              value={testerTgId}
              onChange={(e) => setTesterTgId(e.target.value)}
              placeholder="e.g. 548670437"
              className="w-full bg-black/60 rounded-2xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:-amber-500"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-white/70 block">
              Generated Deep Link (Telegram Bot):
            </label>
            <div className="bg-black/50 p-2.5 rounded-2xl flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-amber-300 truncate">
                {sampleRefLink}
              </span>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sampleRefLink);
                    setCopiedRefLink(true);
                    setTimeout(() => setCopiedRefLink(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-bold flex items-center space-x-1"
                >
                  {copiedRefLink ? <Check className="w-3 h-3 text-[#007AFF]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRefLink ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={sampleRefLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-[11px] font-bold flex items-center space-x-1"
                >
                  <span>Test in Telegram</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Message Modal */}
      {testModalBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#18181B] rounded-2xl p-6 w-full max-w-md relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <Send className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Send Test Message via @{testModalBot.botUsername}
                </h3>
              </div>
              <button
                onClick={() => setTestModalBot(null)}
                className="text-white/60 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-white/70 block mb-1 font-semibold">
                  Recipient Telegram Chat ID:
                </label>
                <input
                  type="text"
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                  placeholder="e.g. 548670437 or your personal Telegram ID"
                  className="w-full bg-black/60 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:-sky-500"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  You must have sent <code>/start</code> to the bot at least once so it can message you.
                </p>
              </div>

              <div>
                <label className="text-white/70 block mb-1 font-semibold">Message Text (HTML):</label>
                <textarea
                  value={testMessageText}
                  onChange={(e) => setTestMessageText(e.target.value)}
                  rows={3}
                  className="w-full bg-black/60 rounded-xl p-2.5 text-white font-sans text-xs focus:outline-none focus:-sky-500"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${ testResult.success ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-rose-500/10 text-rose-400' }`}
                >
                  {testResult.text}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1C2632]">
                <button
                  onClick={() => setTestModalBot(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold"
                >
                  Close
                </button>
                <button
                  onClick={handleSendTestMessage}
                  disabled={isSendingTest || !testChatId.trim()}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-black rounded-xl text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Message</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

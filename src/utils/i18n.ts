export type LanguageCode = 'en' | 'zh' | 'ru';

export interface Translations {
  // Navigation & General
  home: string;
  earn: string;
  assets: string;
  profile: string;
  deposit: string;
  withdraw: string;
  balance: string;
  bonusBalance: string;
  totalProfit: string;
  activeInvestments: string;

  // Bot Messages
  botWelcome: string;
  botLaunchBtn: string;
  botDepositAlertTitle: string;
  botDepositApprovedTitle: string;
  botReferralNotification: string;

  // Actions
  copy: string;
  copied: string;
  confirm: string;
  cancel: string;
  save: string;
  language: string;
}

export const translations: Record<LanguageCode, Translations> = {
  en: {
    home: 'Home',
    earn: 'Earn',
    assets: 'Wallet',
    profile: 'Profile',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    balance: 'Total Balance',
    bonusBalance: 'Bonus Balance',
    totalProfit: 'Total Profit',
    activeInvestments: 'Active Strategies',

    botWelcome: '🚀 **Welcome to AI Crypto Arbitrage Engine!**\n\nAutomated cross-exchange & flash loan arbitrage system extracting real-time liquidity spreads across global crypto markets.\n\nTap the button below to launch the trading terminal and manage your portfolio:',
    botLaunchBtn: '⚡ Launch Arbitrage App',
    botDepositAlertTitle: '🚨 New Deposit Submitted!',
    botDepositApprovedTitle: '✅ Deposit Confirmed & Credited!',
    botReferralNotification: '🎉 New partner joined using your referral link!',

    copy: 'Copy',
    copied: 'Copied!',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    language: 'English'
  },

  zh: {
    home: '首页',
    earn: '理财收益',
    assets: '钱包',
    profile: '个人中心',
    deposit: '充值',
    withdraw: '提现',
    balance: '总资产',
    bonusBalance: '体验金余额',
    totalProfit: '累计收益',
    activeInvestments: '运行中策略',

    botWelcome: '🚀 **欢迎使用 AI 加密套利智能机器人！**\n\n跨交易所与闪电贷自动化套利系统，实时监控全球主流交易所价差与套利机会。\n\n点击下方按钮启动交易终端并管理您的投资组合：',
    botLaunchBtn: '⚡ 启动套利应用',
    botDepositAlertTitle: '🚨 收到新的充值申请！',
    botDepositApprovedTitle: '✅ 充值已确认并成功到账！',
    botReferralNotification: '🎉 成功邀请新用户加入！',

    copy: '复制',
    copied: '已复制！',
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    language: '中文'
  },

  ru: {
    home: 'Главная',
    earn: 'Доход',
    assets: 'Кошелек',
    profile: 'Профиль',
    deposit: 'Пополнить',
    withdraw: 'Вывести',
    balance: 'Общий баланс',
    bonusBalance: 'Бонусный баланс',
    totalProfit: 'Общая прибыль',
    activeInvestments: 'Активные стратегии',

    botWelcome: '🚀 **Добро пожаловать в AI Crypto Arbitrage Engine!**\n\nАвтоматизированная система арбитража между биржами и флеш-кредитования в реальном времени.\n\nНажмите кнопку ниже, чтобы открыть торговый терминал и управлять портфелем:',
    botLaunchBtn: '⚡ Открыть Терминал',
    botDepositAlertTitle: '🚨 Зарегистрирован новый депозит!',
    botDepositApprovedTitle: '✅ Депозит подтвержден и зачислен!',
    botReferralNotification: '🎉 Новый партнер зарегистрирован по вашей ссылке!',

    copy: 'Копировать',
    copied: 'Скопировано!',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
    save: 'Сохранить',
    language: 'Русский'
  }
};

/**
 * Detect user language code from Telegram WebApp initData or browser
 */
export function detectUserLanguage(tgLanguageCode?: string | null): LanguageCode {
  const tgCode = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code : '';
  const navCode = typeof navigator !== 'undefined' ? navigator.language : '';
  const code = (tgLanguageCode || tgCode || navCode || 'en').toLowerCase();

  if (code.startsWith('zh') || code.startsWith('cn')) return 'zh';
  if (code.startsWith('ru')) return 'ru';
  if (code.startsWith('en')) return 'en';

  return 'en'; // Default fallback for international languages
}

export function getTranslation(lang: LanguageCode): Translations {
  return translations[lang] || translations.en;
}

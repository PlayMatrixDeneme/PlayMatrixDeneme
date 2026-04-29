'use strict';

const MARKET_CATALOG_VERSION = 'market-phase1-20260429';
const FRAME_COUNT = 32;

const COSMETIC_TYPES = Object.freeze({
  FRAME: 'frame',
  STATS_BACKGROUND: 'stats_background',
  CHAT_BUBBLE: 'chat_bubble',
  NAMEPLATE: 'nameplate',
  BADGE: 'badge',
  NAME_STYLE: 'name_style'
});

const RARITY_ORDER = Object.freeze(['common', 'rare', 'epic', 'legendary', 'mythic']);
const RARITY_PRICE = Object.freeze({ common: 2500, rare: 7500, epic: 17500, legendary: 40000, mythic: 90000 });

function frameRarity(index) {
  if (index >= 29) return 'mythic';
  if (index >= 23) return 'legendary';
  if (index >= 15) return 'epic';
  if (index >= 7) return 'rare';
  return 'common';
}

function buildFrameItem(index) {
  const rarity = frameRarity(index);
  return {
    id: `frame_market_${index}`,
    type: COSMETIC_TYPES.FRAME,
    name: `Market Çerçevesi ${index}`,
    description: 'MarketCerceve paketinden gelen premium avatar çerçevesi.',
    priceMcExact: String(RARITY_PRICE[rarity] + (index * 250)),
    assetUrl: `/Cerceve/Market/market-${index}.png`,
    rarity,
    active: true,
    refundable: true,
    revocable: true,
    sortOrder: index,
    tags: ['frame', 'avatar', 'market']
  };
}

const DEFAULT_MARKET_ITEMS = Object.freeze([
  ...Array.from({ length: FRAME_COUNT }, (_, index) => buildFrameItem(index + 1)),
  {
    id: 'stats_bg_neon_grid',
    type: COSMETIC_TYPES.STATS_BACKGROUND,
    name: 'Neon Grid İstatistik Arka Planı',
    description: 'Oyuncu istatistik kartına neon grid sahnesi ekler.',
    priceMcExact: '28000',
    assetUrl: '',
    rarity: 'epic',
    active: true,
    refundable: true,
    revocable: true,
    sortOrder: 201,
    previewClass: 'pm-market-preview--neon-grid',
    tags: ['stats', 'background']
  },
  {
    id: 'stats_bg_cosmic_glass',
    type: COSMETIC_TYPES.STATS_BACKGROUND,
    name: 'Cosmic Glass İstatistik Arka Planı',
    description: 'Cam efektli premium istatistik kartı görünümü.',
    priceMcExact: '46000',
    assetUrl: '',
    rarity: 'legendary',
    active: true,
    refundable: true,
    revocable: true,
    sortOrder: 202,
    previewClass: 'pm-market-preview--cosmic-glass',
    tags: ['stats', 'background']
  },
  {
    id: 'chat_bubble_aurora',
    type: COSMETIC_TYPES.CHAT_BUBBLE,
    name: 'Aurora Sohbet Balonu',
    description: 'Global sohbet ve DM mesajlarına aurora renk geçişi verir.',
    priceMcExact: '18000',
    assetUrl: '',
    rarity: 'epic',
    active: true,
    refundable: true,
    revocable: true,
    sortOrder: 301,
    previewClass: 'pm-market-preview--bubble-aurora',
    tags: ['chat', 'bubble']
  },
  {
    id: 'chat_bubble_obsidian',
    type: COSMETIC_TYPES.CHAT_BUBBLE,
    name: 'Obsidian Sohbet Balonu',
    description: 'Sohbet mesajları için koyu cam ve neon kenarlık teması.',
    priceMcExact: '24000',
    assetUrl: '',
    rarity: 'legendary',
    active: true,
    refundable: true,
    revocable: true,
    sortOrder: 302,
    previewClass: 'pm-market-preview--bubble-obsidian',
    tags: ['chat', 'bubble']
  },
  {
    id: 'nameplate_cyber_crown',
    type: COSMETIC_TYPES.NAMEPLATE,
    name: 'Cyber Crown İsimlik',
    description: 'Profil ve sosyal merkezde özel premium isim etiketi.',
    priceMcExact: '52000',
    assetUrl: '',
    rarity: 'legendary',
    active: true,
    refundable: true,
    revocable: true,
    sortOrder: 401,
    previewClass: 'pm-market-preview--nameplate-crown',
    tags: ['nameplate']
  },
  {
    id: 'badge_founder_spark',
    type: COSMETIC_TYPES.BADGE,
    name: 'Founder Spark Rozeti',
    description: 'Profilde ve leaderboard detaylarında görünen koleksiyon rozeti.',
    priceMcExact: '65000',
    assetUrl: '',
    rarity: 'mythic',
    active: true,
    refundable: true,
    revocable: true,
    sortOrder: 501,
    previewClass: 'pm-market-preview--badge-spark',
    tags: ['badge']
  },
  {
    id: 'name_style_prismatic',
    type: COSMETIC_TYPES.NAME_STYLE,
    name: 'Prismatic İsim Efekti',
    description: 'Kullanıcı adına hareketli renkli yazı efekti verir.',
    priceMcExact: '75000',
    assetUrl: '',
    rarity: 'mythic',
    active: true,
    refundable: true,
    revocable: true,
    sortOrder: 601,
    previewClass: 'pm-market-preview--name-prismatic',
    tags: ['name', 'effect']
  }
]);

function getDefaultMarketItems() {
  return DEFAULT_MARKET_ITEMS.map((item) => ({ ...item, tags: Array.isArray(item.tags) ? [...item.tags] : [] }));
}

module.exports = {
  MARKET_CATALOG_VERSION,
  COSMETIC_TYPES,
  RARITY_ORDER,
  DEFAULT_MARKET_ITEMS,
  getDefaultMarketItems
};

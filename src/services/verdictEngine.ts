import { SentimentData, MarketTicker, VerdictAnalysis } from '../types';

export function generateLiveVerdict(
  ticker: MarketTicker | undefined,
  sentiment: SentimentData | undefined,
  rsi: number = 52
): VerdictAnalysis {
  if (!ticker || !sentiment) {
    return {
      bias: 'NEUTRAL',
      headline: 'Veri Bekleniyor',
      detail: 'Piyasa ve vadeli balina pozisyon verileri taranıyor...',
      whaleVerdict: 'Nötr / Analiz ediliyor',
      retailVerdict: 'Nötr / Analiz ediliyor',
      actionRecommendation: 'Pozisyon açmadan önce 5m kapanışını bekleyin.',
      riskRating: 'ORTA'
    };
  }

  const topLongRatio = sentiment.topPosition.longPct / (sentiment.topPosition.shortPct || 1);
  const globalLongRatio = sentiment.globalExposure.longPct / (sentiment.globalExposure.shortPct || 1);
  const isNegativeFunding = ticker.fr < -0.00005;
  const isHighPositiveFunding = ticker.fr > 0.0003;

  // Condition 1: Short Squeeze
  if (topLongRatio > 1.35 && globalLongRatio < 0.95 && isNegativeFunding) {
    return {
      bias: 'SQUEEZE_ALERT',
      headline: '⚡ GÜÇLÜ BOĞA & SHORT SQUEEZE ALARMI',
      detail: `Balinalar agresif Long pozisyonunda (${sentiment.topPosition.longPct}%), perakende ise Short'ta terste kaldı (${sentiment.globalExposure.shortPct}%). Fonlama oranı eksi (${(ticker.fr * 100).toFixed(4)}%), short kapatma dalgasıyla yukarı sert patlama potansiyeli yüksek!`,
      whaleVerdict: `🟢 Balinalar %${sentiment.topPosition.longPct} Long ağırlıklı`,
      retailVerdict: `🔴 Perakende %${sentiment.globalExposure.shortPct} Short'ta sıkışmış durumda`,
      actionRecommendation: 'Long yönlü pozisyonlar korunabilir. Kademeli kâr realizasyonu (TP1/TP2) açın.',
      riskRating: 'ORTA'
    };
  }

  // Condition 2: Distribution / Dangerous Peak
  if (topLongRatio < 1.05 && ticker.chgPct > 15 && (sentiment.oiChange15m || 0) < 0) {
    return {
      bias: 'DANGER_DISTRIBUTION',
      headline: '🚨 TEHLİKE / BALİNA DAĞITIMI & KÂR SATIŞI',
      detail: `Fiyat zirveye tırmanırken açık pozisyon (OI) eriyor ve Top Trader Long üstünlüğü çöktü (${sentiment.topPosition.longPct}%). Balinalar masadan kârlarını alıp çıkıyor, fiyatta sert bir düzeltme riski kapıda!`,
      whaleVerdict: `🔴 Balina Long oranı %${sentiment.topPosition.longPct} seviyesine geriledi`,
      retailVerdict: `⚠️ Perakende tepeye alım yapmaya devam ediyor`,
      actionRecommendation: 'Yeni Long açmayın! Mevcut pozisyonlarda TP alıp nakit marjini artırın.',
      riskRating: 'KRİTİK'
    };
  }

  // Condition 3: Bottom Reversal
  if (rsi < 35 && topLongRatio > 1.25) {
    return {
      bias: 'BULLISH',
      headline: '💎 DİP DÖNÜŞÜ & BALİNA AKÜMÜLASYONU',
      detail: `RSI ${rsi.toFixed(1)} ile aşırı satım bölgesine inmişken elit traderlar gizlice Long tarafına geçiyor (%${sentiment.topPosition.longPct}). Satıcıların gücü tükeniyor, dip sıçraması teyit edilebilir.`,
      whaleVerdict: `🟢 Balinalar dipte pozisyon biriktiriyor (%${sentiment.topPosition.longPct} Long)`,
      retailVerdict: `🔴 Küçük yatırımcı panik satışı yapıyor (%${sentiment.globalExposure.shortPct} Short)`,
      actionRecommendation: 'Kasa kuralına uygun (%2 teminat, düşük kaldıraç) kademeli Long girişi değerlendirilebilir.',
      riskRating: 'DÜŞÜK'
    };
  }

  // Condition 4: Long Squeeze Warning
  if (isHighPositiveFunding && globalLongRatio > 1.6) {
    return {
      bias: 'BEARISH',
      headline: '⚠️ AŞIRI COŞKU & LONG TASFİYE RİSKİ',
      detail: `Fonlama aşırı şişmiş (+%${(ticker.fr * 100).toFixed(4)}) ve perakende çılgınca Long açmış (%${sentiment.globalExposure.longPct}). Piyasa yapıcı stop patlatmak için alt desteklere doğru sert bir tasfiye iğnesi atabilir.`,
      whaleVerdict: `⚖️ Balinalar temkinli (%${sentiment.topPosition.shortPct} Short hedge)`,
      retailVerdict: `🚨 Perakende aşırı coşkulu (%${sentiment.globalExposure.longPct} Long)`,
      actionRecommendation: 'Kaldıraç oranını düşürün, likidasyon güvenlik mesafesini en az %40 üzerinde tutun.',
      riskRating: 'YÜKSEK'
    };
  }

  // Default Bullish / Bearish based on Whale positioning
  if (topLongRatio >= 1.2) {
    return {
      bias: 'BULLISH',
      headline: '📈 YAPISAL BOĞA KORİDORU & DÜZENLİ PARA GİRİŞİ',
      detail: `Kurumsal traderlar pozitif eğilimli (%${sentiment.topPosition.longPct} Long). Alım derinliği satış tarafını dengeliyor. Stop-loss'suz kasa modelinde marjin korumasıyla yukarı trend hedeflenebilir.`,
      whaleVerdict: `🟢 Net Balina Long Paritesi: ${topLongRatio.toFixed(2)}x`,
      retailVerdict: `🌐 Perakende Oranı: %${sentiment.globalExposure.longPct} Long / %${sentiment.globalExposure.shortPct} Short`,
      actionRecommendation: 'Kademeli TP hedefleri belirleyip likidasyon fiyatını güvenli mesafede tutun.',
      riskRating: 'DÜŞÜK'
    };
  } else {
    return {
      bias: 'BEARISH',
      headline: '📉 TEMKİNLİ BASKI & SATIŞ DUVARI GÖZLEMİ',
      detail: `Vadeli piyasada elit hesapların %${sentiment.topPosition.shortPct}'si Short ağırlıklı veya korunma pozisyonunda. Emir defterinde yukarı yönde ask duvarları dikkat çekiyor.`,
      whaleVerdict: `🔴 Elit hesaplar Short / Hedge modunda (%${sentiment.topPosition.shortPct})`,
      retailVerdict: `🌐 Perakende tarafı dengesiz`,
      actionRecommendation: 'Düşüş yönlü düzeltme bitene kadar ekleme yapmayın.',
      riskRating: 'ORTA'
    };
  }
}

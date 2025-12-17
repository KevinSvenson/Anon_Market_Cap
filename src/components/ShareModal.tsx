import { useState } from 'react';
import { X, Download, Link2, Twitter } from 'lucide-react';
import { toPng } from 'html-to-image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getPrivacyMetadata } from '@/data/privacyMetadata';
import type { Cryptocurrency } from '@/services/coingecko';

interface ShareModalProps {
  coin: Cryptocurrency;
  open: boolean;
  onClose: () => void;
}

export const ShareModal = ({ coin, open, onClose }: ShareModalProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const metadata = getPrivacyMetadata(coin.id);
  const displayTech = metadata?.displayTech || metadata?.technology || 'Unknown';
  const privacyLevel = metadata?.privacyLevel || 'Unknown';

  // Generate shareable URL
  const shareUrl = `${window.location.origin}/coin/${coin.id}`;

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Share via Web Share API (mobile-friendly)
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${coin.name} (${coin.symbol.toUpperCase()}) on AnonMarketCap`,
          text: `Check out ${coin.name} - ${displayTech} privacy coin`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Download as image
  const handleDownloadImage = async () => {
    const cardElement = document.getElementById('share-card');
    if (!cardElement) return;

    setIsGenerating(true);

    try {
      const dataUrl = await toPng(cardElement, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
      });

      const link = document.createElement('a');
      link.download = `${coin.symbol.toLowerCase()}-anonmarketcap.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Share to Twitter
  const handleShareTwitter = () => {
    const text = `${coin.name} ($${coin.symbol.toUpperCase()}) - ${displayTech} privacy coin\n\n📈 24h: ${coin.price_change_percentage_24h?.toFixed(2)}%\n🔒 Privacy Level: ${privacyLevel}\n\nvia @AnonMarketCap`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share {coin.name}</DialogTitle>
        </DialogHeader>

        {/* Shareable Card */}
        <div
          id="share-card"
          className="bg-gradient-to-br from-card via-card to-accent/20 border border-border rounded-xl p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <img
              src={coin.image}
              alt={coin.name}
              className="w-16 h-16 rounded-full"
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold">{coin.name}</h3>
              <p className="text-sm text-muted-foreground">
                ${coin.symbol.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Price & Performance */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                ${coin.current_price < 1
                  ? coin.current_price.toFixed(6)
                  : coin.current_price.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
              </span>
              <span className={cn(
                "text-lg font-semibold",
                (coin.price_change_percentage_24h || 0) >= 0
                  ? "text-green-500"
                  : "text-red-500"
              )}>
                {(coin.price_change_percentage_24h || 0) >= 0 ? "+" : ""}
                {coin.price_change_percentage_24h?.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Market Cap</span>
                <p className="font-medium">
                  ${((coin.market_cap || 0) / 1e9).toFixed(2)}B
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">24h Volume</span>
                <p className="font-medium">
                  ${((coin.total_volume || 0) / 1e6).toFixed(2)}M
                </p>
              </div>
            </div>
          </div>

          {/* Technology & Privacy */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Technology:</span>
              <Badge variant="outline" className="bg-primary/10">
                {displayTech}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Privacy Level:</span>
              <div className="flex gap-0.5">
                {privacyLevel === 'High' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </>
                )}
                {privacyLevel === 'Medium' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <div className="w-2 h-2 rounded-full bg-muted"></div>
                  </>
                )}
                {privacyLevel === 'Minimal' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    <div className="w-2 h-2 rounded-full bg-muted"></div>
                    <div className="w-2 h-2 rounded-full bg-muted"></div>
                  </>
                )}
              </div>
              <span className="text-sm font-medium">{privacyLevel}</span>
            </div>
          </div>

          {/* Branding */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                AnonMarketCap.com
              </span>
              <span className="text-xs text-muted-foreground">
                Privacy Crypto Tracker
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full"
          >
            <Link2 className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Share Link'}
          </Button>

          <Button
            onClick={handleDownloadImage}
            variant="outline"
            className="w-full"
            disabled={isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Download'}
          </Button>
        </div>

        <Button
          onClick={handleShareTwitter}
          className="w-full bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
        >
          <Twitter className="h-4 w-4 mr-2 fill-current" />
          Share on Twitter
        </Button>
      </DialogContent>
    </Dialog>
  );
};


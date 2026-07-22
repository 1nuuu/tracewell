"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TOKEN_LIST_DEFAULT } from "@/lib/constants";

interface CoinData {
  lastUpdated: string;
  price: number;
  volume: number;
  volatility: number;
  direction: number;
  name: string;
  symbol: string;
  fitness?: number;
  forecast?: {
    mean: number;
    low: number;
    high: number;
  };
}

interface FeaturesProps {
  initialCoinId?: string;
}

export default function Features({ initialCoinId }: FeaturesProps = {}) {
  const coins = TOKEN_LIST_DEFAULT.sort((a, b) => a.name.localeCompare(b.name));
  const router = useRouter();
  const pathname = usePathname();

  const getCoinIdFromPath = () => {
    if (initialCoinId) return initialCoinId;
    const pathSegments = pathname.split("/").filter(Boolean);
    return pathSegments.length > 0 ? pathSegments[0] : "bitcoin";
  };

  const [selectedCoinId, setSelectedCoinId] = useState<string>(getCoinIdFromPath());
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, { data: CoinData; timestamp: number }>>(new Map());
  const CACHE_TTL = 30 * 1_000;

  const handleTokenChange = (newId: string) => {
    setSelectedCoinId(newId);
    const newPath = newId === "bitcoin" ? "/" : `/${newId}`;
    router.push(newPath, { scroll: false });
  };

  useEffect(() => {
    const idFromPath = getCoinIdFromPath();
    if (idFromPath !== selectedCoinId) setSelectedCoinId(idFromPath);
  }, [pathname, initialCoinId]);

  useEffect(() => {
    if (selectedCoinId) {
      const cached = cacheRef.current.get(selectedCoinId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setCoinData(cached.data);
        setError(null);
        return;
      }

      const controller = new AbortController();
      const fetchCoinData = async () => {
        setLoading(true);
        setError(null);
        setCoinData(null);
        try {
          const res = await fetch(`/api/features/all/${selectedCoinId}`, { signal: controller.signal });
          const data = await res.json();
          if (data.error) setError(data.error);
          else { setCoinData(data); cacheRef.current.set(selectedCoinId, { data, timestamp: Date.now() }); }
        } catch (err) {
          if (controller.signal.aborted) return;
          setError("Failed to fetch coin data");
        } finally { setLoading(false); }
      };
      fetchCoinData();
      return () => controller.abort();
    }
  }, [selectedCoinId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Tracewell Markets
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            On-chain verified market data with traceable AI analysis on Ritual Chain
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <Select value={selectedCoinId} onValueChange={handleTokenChange}>
            <SelectTrigger id="coin-select" className="w-full max-w-md h-12 rounded-xl border-border bg-card text-base shadow-sm">
              <SelectValue placeholder="Choose a cryptocurrency...">
                {selectedCoinId && (() => {
                  const selected = coins.find(c => c.id === selectedCoinId);
                  if (!selected) return null;
                  return (
                    <div className="flex items-center gap-3">
                      <img src={selected.logo} alt={selected.name} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <span className="font-semibold" style={{ color: selected.brandColor }}>{selected.name}</span>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {coins.map(coin => (
                <SelectItem key={coin.id} value={coin.id}>
                  <div className="flex items-center gap-2">
                    <img src={coin.logo} alt={coin.name} className="w-5 h-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <span>{coin.name} ({coin.symbol})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Two-column dashboard layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main market data — 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                <CardHeader><CardTitle className="text-red-600">Error</CardTitle></CardHeader>
                <CardContent><p className="text-red-500">{error}</p></CardContent>
              </Card>
            )}

            {loading && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <span className="ml-3 text-muted-foreground">Loading data...</span>
                </CardContent>
              </Card>
            )}

            {coinData && !loading && (() => {
              const selected = coins.find(c => c.id === selectedCoinId);
              const brand = selected?.brandColor || "#627EEA";
              return (
                <Card className="overflow-hidden border-border bg-card shadow-lg">
                  <div className="h-1" style={{ backgroundColor: brand }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {selected?.logo && (
                        <img src={selected.logo} alt={coinData.name} className="w-10 h-10 rounded-full" />
                      )}
                      <div>
                        <CardTitle className="text-2xl" style={{ color: brand }}>
                          {coinData.name} ({coinData.symbol})
                        </CardTitle>
                        <CardDescription>
                          Updated {formatRelativeTime(coinData.lastUpdated)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <StatCard label="Price (USD)" value={formatCurrency(coinData.price)} color={brand} />
                      <StatCard label="24H Volume" value={formatLargeNumber(coinData.volume)} color={brand} />
                      <StatCard label="24H Change" value={formatVolatility(coinData.volatility)} color={brand} isVol />
                    </div>

                    {coinData.forecast && (
                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                          <p className="text-xs font-medium text-muted-foreground uppercase">Forecast Mean</p>
                          <p className="mt-1 text-xl font-bold" style={{ color: brand }}>{formatCurrency(coinData.forecast.mean)}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                          <p className="text-xs font-medium text-muted-foreground uppercase">Forecast Low</p>
                          <p className="mt-1 text-xl font-bold text-red-500">{formatCurrency(coinData.forecast.low)}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                          <p className="text-xs font-medium text-muted-foreground uppercase">Forecast High</p>
                          <p className="mt-1 text-xl font-bold text-green-500">{formatCurrency(coinData.forecast.high)}</p>
                        </div>
                      </div>
                    )}

                    {coinData.fitness !== undefined && (
                      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-center">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Backtest Confidence</p>
                        <p className="mt-1 text-2xl font-bold" style={{ color: brand }}>{coinData.fitness.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">60-day backtest accuracy</p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-border text-center">
                      <a href={`/api/features/all/${selectedCoinId}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        View API Response <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Analysis sidebar — 1 column */}
          <div className="space-y-6">
            <TracewellAnalysis />
            <OnChainBadge />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, isVol }: { label: string; value: string; color: string; isVol?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${isVol ? (value.startsWith("+") ? "text-green-500" : "text-red-500") : ""}`} style={isVol ? {} : { color }}>
        {value}
      </p>
    </div>
  );
}

function TracewellAnalysis() {
  const [analysis, setAnalysis] = useState<string>("");
  const [ts, setTs] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analysis/latest")
      .then(r => r.json())
      .then(d => { setAnalysis(d.analysis || ""); setTs(d.timestamp || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="animate-pulse"><CardContent className="py-12" /></Card>;
  if (!analysis) return null;

  const isBearish = analysis.toLowerCase().includes("bearish");
  const isBullish = analysis.toLowerCase().includes("bullish");

  return (
    <Card className="border-border bg-card shadow-lg sticky top-4">
      <div className="h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base">Market Analysis</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {ts ? new Date(Number(ts)).toLocaleString() : ""}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isBearish ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : isBullish ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"}`}>
                {isBearish ? "Bearish" : isBullish ? "Bullish" : "Mixed"}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">{analysis}</p>
      </CardContent>
    </Card>
  );
}

function OnChainBadge() {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">Verified on Ritual Chain</p>
            <p className="text-xs text-muted-foreground">All analysis stored on-chain with keeper EIP-712 signatures</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const formatCurrency = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const formatLargeNumber = (v: number) => v >= 1e12 ? `$${(v/1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : formatCurrency(v);
const formatVolatility = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

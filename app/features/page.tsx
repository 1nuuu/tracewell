"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TOKEN_LIST_DEFAULT } from "@/lib/constants";

interface CoinData {
  lastUpdated: string; price: number; volume: number; volatility: number;
  direction: number; name: string; symbol: string;
  fitness?: number; forecast?: { mean: number; low: number; high: number };
}

export default function Features({ initialCoinId }: { initialCoinId?: string } = {}) {
  const coins = TOKEN_LIST_DEFAULT.sort((a, b) => a.name.localeCompare(b.name));
  const router = useRouter();
  const pathname = usePathname();

  const getCoinIdFromPath = () => {
    if (initialCoinId) return initialCoinId;
    const segs = pathname.split("/").filter(Boolean);
    return segs.length > 0 ? segs[0] : "bitcoin";
  };

  const [selectedCoinId, setSelectedCoinId] = useState(getCoinIdFromPath());
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, { data: CoinData; timestamp: number }>>(new Map());

  useEffect(() => {
    const id = getCoinIdFromPath();
    if (id !== selectedCoinId) setSelectedCoinId(id);
  }, [pathname]);

  useEffect(() => {
    if (!selectedCoinId) return;
    const cached = cacheRef.current.get(selectedCoinId);
    if (cached && Date.now() - cached.timestamp < 30_000) {
      setCoinData(cached.data); setError(null); return;
    }
    const ctrl = new AbortController();
    (async () => {
      setLoading(true); setError(null);
      try {
        const r = await fetch(`/api/features/all/${selectedCoinId}`, { signal: ctrl.signal });
        const d = await r.json();
        if (d.error) setError(d.error);
        else { setCoinData(d); cacheRef.current.set(selectedCoinId, { data: d, timestamp: Date.now() }); }
      } catch (e: any) { if (!ctrl.signal.aborted) setError("Failed to fetch"); }
      finally { setLoading(false); }
    })();
    return () => ctrl.abort();
  }, [selectedCoinId]);

  // Auto-refresh market data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedCoinId) {
        fetch(`/api/features/all/${selectedCoinId}`)
          .then(r => r.json())
          .then(d => {
            if (!d.error) {
              setCoinData(d);
              cacheRef.current.set(selectedCoinId, { data: d, timestamp: Date.now() });
            }
          })
          .catch(() => {});
      }
    }, 300_000); // 5 min
    return () => clearInterval(interval);
  }, [selectedCoinId]);

  // Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".scroll-reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [coinData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-20">
        {/* Header */}
        <div className="scroll-reveal mb-12">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-4">
            On-Chain Market Data
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Tracewell Markets
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-xl">
            Verified price feeds and AI analysis published on Ritual Chain
          </p>
        </div>

        {/* Token selector */}
        <div className="scroll-reveal mb-12 max-w-md">
          <Select value={selectedCoinId} onValueChange={(id) => {
            setSelectedCoinId(id);
            router.push(id === "bitcoin" ? "/" : `/${id}`, { scroll: false });
          }}>
            <SelectTrigger className="h-12 rounded-lg border-border bg-card text-base">
              <SelectValue placeholder="Select token...">
                {selectedCoinId && (() => {
                  const s = coins.find(c => c.id === selectedCoinId);
                  if (!s) return null;
                  return (
                    <div className="flex items-center gap-3">
                      <img src={s.logo} alt={s.name} className="w-6 h-6 rounded-full" onError={(e: any) => e.target.style.display = "none"} />
                      <span className="font-semibold" style={{ color: s.brandColor }}>{s.name}</span>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {coins.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <img src={c.logo} alt={c.name} className="w-5 h-5 rounded-full" onError={(e: any) => e.target.style.display = "none"} />
                    <span>{c.name} ({c.symbol})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dashboard */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main data — 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
                <CardHeader><CardTitle className="text-red-600">Error</CardTitle></CardHeader>
                <CardContent><p className="text-red-500">{error}</p></CardContent>
              </Card>
            )}
            {loading && (
              <Card className="border-border">
                <CardContent className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted-foreground/20 border-t-foreground" />
                  <span className="ml-3 text-sm text-muted-foreground">Loading...</span>
                </CardContent>
              </Card>
            )}
            {coinData && !loading && (() => {
              const s = coins.find(c => c.id === selectedCoinId);
              const brand = s?.brandColor || "#627EEA";
              return (
                <Card className="scroll-reveal border-border bg-card card-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {s?.logo && <img src={s.logo} alt={coinData.name} className="w-8 h-8 rounded-full" />}
                      <div>
                        <CardTitle className="text-xl" style={{ color: brand }}>{coinData.name} ({coinData.symbol})</CardTitle>
                        <CardDescription>Updated {fmtRelative(coinData.lastUpdated)}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      <StatBox label="Price (USD)" value={fmtCurrency(coinData.price)} />
                      <StatBox label="24H Volume" value={fmtLarge(coinData.volume)} />
                      <StatBox label="24H Change" value={fmtVol(coinData.volatility)} highlight />
                    </div>

                    {coinData.forecast && (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <MiniBox label="Forecast Mean" value={fmtCurrency(coinData.forecast.mean)} color={brand} />
                        <MiniBox label="Low" value={fmtCurrency(coinData.forecast.low)} color="#ef4444" />
                        <MiniBox label="High" value={fmtCurrency(coinData.forecast.high)} color="#22c55e" />
                      </div>
                    )}

                    {coinData.fitness !== undefined && (
                      <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4 text-center">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Backtest Confidence</p>
                        <p className="mt-1 text-xl font-bold" style={{ color: brand }}>{coinData.fitness.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">60-day historical accuracy</p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-border text-center">
                      <a href={`/api/features/all/${selectedCoinId}`} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                        View API Response
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Analysis sidebar */}
          <div className="space-y-6">
            <AnalysisCard />
            <VerifiedCard />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4 text-center">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className={`mt-2 text-lg font-bold tabular-nums ${highlight ? (value.startsWith("+") ? "text-green-600" : "text-red-500") : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function MiniBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/10 p-3 text-center">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}

function AnalysisCard() {
  const [analysis, setAnalysis] = useState("");
  const [ts, setTs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => { return fetch("/api/analysis/latest").then(r => r.json()).then(d => { setAnalysis(d.analysis || ""); setTs(d.timestamp || 0); }).catch(() => {}); };
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 300_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Card className="border-border"><CardContent className="py-12" /></Card>;
  if (!analysis) return null;

  const isBearish = /bearish/i.test(analysis);
  const isBullish = /bullish/i.test(analysis);

  // Extract top movers from analysis text for structured display
  const topMoversMatch = analysis.match(/Top movers:\s*(.+?)(?:\.|$)/i);
  const topMovers = topMoversMatch ? topMoversMatch[1].split(",").map(s => s.trim()) : [];
  const sentimentBadge = isBearish ? "Bearish" : isBullish ? "Bullish" : "Mixed";
  const badgeColor = isBearish
    ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800"
    : isBullish
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-amber-200 dark:border-amber-800";

  return (
    <Card className="scroll-reveal border-border bg-card card-hover">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">AI Market Analysis</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                {ts ? fmtRelative(new Date(Number(ts) * 1000)) : ""}
              </CardDescription>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${badgeColor}`}>
            {sentimentBadge}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top movers */}
        {topMovers.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Movers</p>
            <div className="flex flex-wrap gap-1.5">
              {topMovers.map((m, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded border border-border bg-secondary/30 text-[11px] font-medium tabular-nums">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Full analysis */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis}</p>
        </div>

        {/* On-chain verifier */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <p className="text-[10px] text-muted-foreground">
            Verified on Ritual Chain · Keeper EIP-712 signed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function VerifiedCard() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold">On-Chain Verified</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              OracleFeed · <code className="text-[10px] bg-secondary px-1 rounded">0x1968...5E57F</code>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Formatters ─── */

const fmtCurrency = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const fmtLarge = (v: number) => v >= 1e12 ? `$${(v/1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : fmtCurrency(v);
const fmtVol = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

function fmtRelative(date: string | Date): string {
  const diff = Math.floor((Date.now() - new Date(typeof date === "string" ? date : date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

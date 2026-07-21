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
  // Use predefined token list from constants
  const coins = TOKEN_LIST_DEFAULT.sort((a, b) => a.name.localeCompare(b.name));
  const router = useRouter();
  const pathname = usePathname();

  // Extract coin ID from pathname: /bitcoin -> 'bitcoin', / -> 'bitcoin' (default)
  const getCoinIdFromPath = () => {
    if (initialCoinId) return initialCoinId;
    // Extract from pathname: /bitcoin -> bitcoin, /ethereum -> ethereum, / -> bitcoin
    const pathSegments = pathname.split("/").filter(Boolean);
    return pathSegments.length > 0 ? pathSegments[0] : "bitcoin";
  };

  // Initialize from pathname, default to 'bitcoin'
  const [selectedCoinId, setSelectedCoinId] = useState<string>(
    getCoinIdFromPath()
  );
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, { data: CoinData; timestamp: number }>>(
    new Map()
  );
  const CACHE_TTL = 30 * 1_000; // 30 seconds

  // Update URL when token selection changes - use path-based routing
  const handleTokenChange = (newId: string) => {
    setSelectedCoinId(newId);
    // Navigate to /{newId} or / for bitcoin
    const newPath = newId === "bitcoin" ? "/" : `/${newId}`;
    router.push(newPath, { scroll: false });
  };

  // Sync with pathname when URL changes externally (browser back/forward, direct navigation)
  useEffect(() => {
    const idFromPath = getCoinIdFromPath();
    if (idFromPath !== selectedCoinId) {
      setSelectedCoinId(idFromPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const res = await fetch(`/api/features/all/${selectedCoinId}`, {
            signal: controller.signal,
          });
          const data = await res.json();

          if (data.error) {
            setError(data.error);
          } else {
            setCoinData(data);
            cacheRef.current.set(selectedCoinId, {
              data,
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          setError("Failed to fetch coin data");
        } finally {
          setLoading(false);
        }
      };

      fetchCoinData();

      return () => {
        controller.abort();
      };
    }
  }, [selectedCoinId]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatLargeNumber = (value: number): string => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    }
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    }
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`;
    }
    return formatCurrency(value);
  };

  const formatVolatility = (value: number): string => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatRelativeTime = (date: string | Date): string => {
    const now = new Date();
    const then = typeof date === "string" ? new Date(date) : date;
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears === 1 ? "" : "s"} ago`;
  };

  return (
    <section
      className="min-h-screen w-full px-4 py-12 md:py-20 flex items-center justify-center"
      style={
        {
          background:
            "radial-gradient(circle at 20% 20%, rgba(104,75,247,0.45), transparent 55%), radial-gradient(circle at 80% 15%, rgba(28,199,68,0.35), transparent 50%), linear-gradient(135deg, #f7fcff, #fff6fb)",
        } as React.CSSProperties
      }
    >
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-white/40 bg-white/70 p-6 shadow-[0_25px_80px_rgba(104,75,247,0.2)] backdrop-blur-2xl md:p-10">
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/50 bg-white/90 px-6 py-10 text-center shadow-[0_20px_60px_rgba(104,75,247,0.12)]">
            <div
              className="pointer-events-none absolute inset-0 opacity-70 blur-3xl"
              style={
                {
                  background:
                    "radial-gradient(circle at 30% 20%, rgba(255,225,185,0.4), transparent 55%), radial-gradient(circle at 70% 30%, rgba(104,75,247,0.25), transparent 50%)",
                } as React.CSSProperties
              }
            />
            <div className="relative space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Cryptocurrency Market Data
              </h1>
              <p className="max-w-[700px] text-gray-500 md:text-xl">
                Select a cryptocurrency to view its price, volume, and
                volatility
              </p>
            </div>
          </div>

          <div className="flex flex-cols items-center justify-center w-full max-w-3xl rounded-2xl">
            <Select value={selectedCoinId} onValueChange={handleTokenChange}>
              <SelectTrigger
                id="coin-select"
                className="w-full min-h-[3.2rem] rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-base shadow-[0_15px_40px_rgba(0,0,0,0.05)]"
                style={
                  selectedCoinId
                    ? (() => {
                        const selected = coins.find(
                          (c) => c.id === selectedCoinId
                        );
                        return selected
                          ? ({
                              backgroundColor: `${selected.brandBgColor}90`,
                              borderColor: `${selected.brandColor}40`,
                            } as React.CSSProperties)
                          : {};
                      })()
                    : {}
                }
              >
                <SelectValue placeholder="Choose a cryptocurrency...">
                  {selectedCoinId &&
                    (() => {
                      const selected = coins.find(
                        (c) => c.id === selectedCoinId
                      );
                      if (selected) {
                        const lastUpdated = coinData?.lastUpdated
                          ? formatRelativeTime(coinData.lastUpdated)
                          : null;

                        return (
                          <div
                            className="flex items-center gap-3 w-full"
                            style={
                              {
                                "--brand-color": selected.brandColor,
                              } as React.CSSProperties & {
                                "--brand-color": string;
                              }
                            }
                          >
                            <div
                              className="w-8 h-8 rounded-full p-0.5 flex-shrink-0"
                              style={
                                {
                                  backgroundColor: `${selected.brandColor}30`,
                                } as React.CSSProperties
                              }
                            >
                              <img
                                src={selected.logo}
                                alt={selected.name}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[var(--brand-color)] font-semibold text-lg truncate">
                                  {selected.name}
                                </span>
                              </div>
                              {lastUpdated && (
                                <div className="flex-shrink-0">
                                  <span className="text-xs font-medium text-gray-500 bg-white/60 px-2 py-1 rounded-md whitespace-nowrap">
                                    {lastUpdated}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="[&>*[data-highlighted]]:transition-colors">
                {coins.map((coin) => (
                  <SelectItem
                    key={coin.id}
                    value={coin.id}
                    style={
                      {
                        "--brand-color": coin.brandColor,
                        "--brand-bg-color": coin.brandBgColor,
                      } as React.CSSProperties & {
                        "--brand-color": string;
                        "--brand-bg-color": string;
                      }
                    }
                    className="[&[data-highlighted]]:!bg-[var(--brand-bg-color)]/80 [&[data-highlighted]]:!text-[var(--brand-color)] [&[data-highlighted]]:backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2 w-full rounded-2">
                      <img
                        src={coin.logo}
                        alt={coin.name}
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span>
                        {coin.name} ({coin.symbol})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Card className="w-full max-w-md border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardHeader>
                <CardTitle className="text-red-900 dark:text-red-100">
                  Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  <span className="ml-3 text-sm text-gray-500">
                    Loading data...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {coinData &&
            !loading &&
            (() => {
              const selectedCoin = coins.find((c) => c.id === selectedCoinId);
              const brandColor = selectedCoin?.brandColor || "#627EEA";
              const brandBgColor = selectedCoin?.brandBgColor || "#EEF2FF";
              const logo = selectedCoin?.logo || "";
              const lastUpdated =
                coinData.lastUpdated || new Date().toISOString();
              return (
                <Card className="group/card relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/50 bg-white/85 p-2 shadow-[0_30px_60px_rgba(104,75,247,0.15)] transition duration-300">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-60 blur-3xl rounded-2xl"
                    style={
                      {
                        background: `linear-gradient(120deg, ${brandColor}25, rgba(104,75,247,0.25), transparent 70%)`,
                      } as React.CSSProperties
                    }
                  />
                  <div className="relative rounded-2xl border border-white/40 bg-white/90">
                    <div
                      className="h-1 w-full rounded-2xl"
                      style={{
                        backgroundColor: brandColor,
                        borderRadius: "12px",
                      }}
                    />
                    <CardHeader className="relative overflow-hidden rounded-2xl pb-4 py-3 shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition-all duration-500 group-hover/card:py-1 group-hover/card:shadow-none group-hover/card:min-h-[20px]">
                      <div className="flex items-center gap-3 transition-all duration-500 group-hover/card:-translate-y-3 group-hover/card:opacity-0">
                        {logo && (
                          <div
                            className="w-10 h-10 rounded-full p-0.5 shadow-[0_15px_40px_rgba(0,0,0,0.05)]"
                            style={
                              {
                                backgroundColor: `${brandColor}30`,
                              } as React.CSSProperties
                            }
                          >
                            <img
                              src={logo}
                              alt={coinData.name}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <CardTitle
                            className="text-2xl"
                            style={{ color: brandColor }}
                          >
                            {coinData.name} ({coinData.symbol})
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <span className="text-xs text-gray-600">
                              Updated{" "}
                              <span className="font-semibold text-gray-700 bg-neutral-400/20 px-1.5 py-0.5 rounded-sm">
                                {formatRelativeTime(lastUpdated)}
                              </span>
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      <div
                        className="pointer-events-none absolute left-4 right-4 top-1/2 h-[3px] rounded-full opacity-0 transition-all duration-500 group-hover/card:opacity-100 group-hover/card:translate-y-[2px]"
                        style={
                          {
                            backgroundColor: `${brandColor}70`,
                          } as React.CSSProperties
                        }
                      />
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:gap-6 md:grid-cols-3">
                        <div
                          className="space-y-2 rounded-2xl border border-white/50 bg-white/85 p-4 text-center shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition hover:-translate-y-1"
                          style={
                            {
                              backgroundColor: `${brandBgColor}35`,
                            } as React.CSSProperties
                          }
                        >
                          <p className="text-sm font-medium text-gray-600">
                            Market Price (USD)
                          </p>
                          <p
                            className="text-2xl font-bold"
                            style={{ color: brandColor }}
                          >
                            {formatCurrency(coinData.price)}
                          </p>
                        </div>
                        <div
                          className="space-y-2 rounded-2xl border border-white/50 bg-white/85 p-4 text-center shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition hover:-translate-y-1"
                          style={
                            {
                              backgroundColor: `${brandBgColor}35`,
                            } as React.CSSProperties
                          }
                        >
                          <p className="text-sm font-medium text-gray-600">
                            24H Volume (USD)
                          </p>
                          <p
                            className="text-2xl font-bold"
                            style={{ color: brandColor }}
                          >
                            {formatLargeNumber(coinData.volume)}
                          </p>
                        </div>
                        <div
                          className="space-y-2 rounded-2xl border border-white/50 bg-white/85 p-4 text-center shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition hover:-translate-y-1"
                          style={
                            {
                              backgroundColor: `${brandBgColor}35`,
                            } as React.CSSProperties
                          }
                        >
                          <p className="text-sm font-medium text-gray-600">
                            24H Volatility (%)
                          </p>
                          <p
                            className={`text-2xl font-bold ${
                              coinData.volatility >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {formatVolatility(coinData.volatility)}
                          </p>
                        </div>
                      </div>
                      {coinData.forecast && (
                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                          <div
                            className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/85 p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition hover:-translate-y-1"
                            style={
                              {
                                backgroundImage: `radial-gradient(circle at top left, ${brandBgColor}70, transparent 45%)`,
                              } as React.CSSProperties
                            }
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Naïve Forecast Price (USD)
                            </p>
                            <p
                              className="mt-2 text-3xl font-bold tracking-tight"
                              style={{ color: brandColor }}
                            >
                              {formatCurrency(coinData.forecast.mean)}
                            </p>
                            <div className="grid grid-cols-1 rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-gray-600">
                              {formatCurrency(coinData.forecast.low)} –{" "}
                              {formatCurrency(coinData.forecast.high)}
                              <span className="col-span-1 text-xs font-normal text-gray-500">
                                (expected range)
                              </span>
                            </div>
                          </div>

                          <div
                            className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/85 p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition hover:-translate-y-1"
                            style={
                              {
                                backgroundImage: `radial-gradient(circle at top right, ${brandColor}25, transparent 45%)`,
                              } as React.CSSProperties
                            }
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Forecast Confidence
                            </p>
                            <p
                              className="mt-2 text-3xl font-bold tracking-tight"
                              style={{ color: brandColor }}
                            >
                              {(coinData.fitness ?? 0).toFixed(2)}%
                            </p>
                            <div className="mt-3 flex flex-col items-center gap-1 text-xs text-gray-500">
                              <span>Based on 60-day backtest</span>
                              <a
                                href={`/api/features/all/${selectedCoinId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-color)] underline-offset-2 hover:underline"
                              >
                                View{" "}
                                {coinData.symbol?.toUpperCase() ?? "Forecast"}{" "}
                                Backtest
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <a
                          href={`/api/features/all/${selectedCoinId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-opacity hover:text-[var(--brand-color)] hover:bg-foreground/50"
                          style={{
                            backgroundColor: brandBgColor,
                            color: brandColor,
                          }}
                        >
                          View API JSON Response
                          <svg
                            className="ml-2 size-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })()}
        </div>
      </div>
    </section>
  );
}

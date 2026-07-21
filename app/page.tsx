"use client";

import Features from "./features/page";

export default function Home() {
  // Root path defaults to bitcoin
  return (
    <div>
      <Features initialCoinId="bitcoin" />
    </div>
  );
}


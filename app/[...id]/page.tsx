"use client";

import { use } from "react";
import Features from "@/app/features/page";

interface PageProps {
  params: Promise<{
    id?: string[];
  }>;
}

export default function DynamicPage({ params }: PageProps) {
  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);
  // Extract id from path: /bitcoin -> ['bitcoin'], / -> []
  const coinId = resolvedParams.id && resolvedParams.id.length > 0 ? resolvedParams.id[0] : 'bitcoin';
  
  return (
    <div>
      <Features initialCoinId={coinId} />
    </div>
  );
}

'use client';

import dynamic from 'next/dynamic';

const FermiApp = dynamic(
  () => import('@/components/graph/FermiApp').then(mod => mod.FermiApp),
  { ssr: false }
);

export default function Home() {
  return <FermiApp />;
}

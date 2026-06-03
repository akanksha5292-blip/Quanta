import { HomeHero } from "@/components/layout/HomeHero";
import { DevSeedPanel } from "@/components/layout/DevSeedPanel";
import { isClerkFullyConfigured } from "@/lib/config";
import { formatIstDate } from "@/lib/ist";

export default function HomePage() {
  return (
    <HomeHero
      today={formatIstDate()}
      clerkReady={isClerkFullyConfigured()}
      devPanel={process.env.NODE_ENV === "development" ? <DevSeedPanel /> : null}
    />
  );
}

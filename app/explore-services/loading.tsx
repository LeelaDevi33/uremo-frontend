import { LoadingState, MarketPage } from "@/components/opportunities/MarketUI";

export default function ExploreLoading() {
  return <MarketPage><LoadingState label="Loading opportunities…" /></MarketPage>;
}

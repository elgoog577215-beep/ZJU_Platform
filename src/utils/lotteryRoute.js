import { getEventUrl } from "./hackathonRoute.js";

export const getLotteryUrl = (campaign) =>
    campaign.event_key
        ? getEventUrl(campaign.event_key, "lottery", {
              search: new URLSearchParams({ campaign: campaign.id }).toString(),
          })
        : `/lotteries/${encodeURIComponent(campaign.id)}`;

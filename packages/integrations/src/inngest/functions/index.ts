import "server-only";

import { forwardConversion } from "./forward-conversion";
import { onItemCreated } from "./item-created";
import { onOrderStatusChanged } from "./order-status-changed";
import { onPriceSampleRecorded } from "./price-sample-recorded";
import { onPriceSyncRequested } from "./price-sync-requested";
import { onWalletCredited } from "./wallet-credited";

export const inngestFunctions = [
  onItemCreated,
  onOrderStatusChanged,
  forwardConversion,
  onWalletCredited,
  onPriceSampleRecorded,
  onPriceSyncRequested,
];

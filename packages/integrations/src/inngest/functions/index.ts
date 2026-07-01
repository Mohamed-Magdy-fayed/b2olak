import "server-only";

import { forwardConversion } from "./forward-conversion";
import { onItemCreated } from "./item-created";
import { onOrderStatusChanged } from "./order-status-changed";
import { onWalletCredited } from "./wallet-credited";

export const inngestFunctions = [
  onItemCreated,
  onOrderStatusChanged,
  forwardConversion,
  onWalletCredited,
];

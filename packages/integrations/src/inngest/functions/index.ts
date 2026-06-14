import { forwardConversion } from "./forward-conversion";
import { onItemCreated } from "./item-created";
import { onOrderStatusChanged } from "./order-status-changed";

export const inngestFunctions = [onItemCreated, onOrderStatusChanged, forwardConversion];

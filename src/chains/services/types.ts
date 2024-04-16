import { z } from "zod";
import { priceApiResponseSchema } from "./schemas";

export type PriceApiResponse = z.infer<typeof priceApiResponseSchema>;

import { Trade } from "../types";

function calculatePnLPercentage(trade: Trade): number {
    const { buyingPrice, sellingPrice, quantity, fees = 0 } = trade;
    const totalCost = buyingPrice * quantity + fees;
    const totalRevenue = sellingPrice * quantity;
    const pnlPercentage = ((totalRevenue - totalCost) / (buyingPrice * quantity)) * 100;
    return pnlPercentage;
}



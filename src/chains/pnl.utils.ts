import { Trade } from "../types";


// function calculateCumulativePnLPercentage(trades: Trade[]): string {
//     let totalBuyingCost = 0;
//     let totalSellingRevenue = 0;
//     let totalFees = 0;

//     trades.forEach(trade => {
//         totalBuyingCost += trade.buyingPrice * trade.quantity;
//         totalSellingRevenue += trade.sellingPrice * trade.quantity;
//         totalFees += trade.fees || 0;
//     });

//     const totalCost = totalBuyingCost + totalFees;
//     const pnlPercentage = ((totalSellingRevenue - totalCost) / totalBuyingCost) * 100;

//     return pnlPercentage.toFixed(2) + '%';
// }





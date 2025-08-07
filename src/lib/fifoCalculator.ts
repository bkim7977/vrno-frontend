// FIFO (First In, First Out) calculator for asset gains/losses

interface Purchase {
  quantity: number;
  price: number;
  timestamp: string;
}

interface Sale {
  quantity: number;
  price: number;
  timestamp: string;
}

interface FIFOResult {
  totalGainLoss: number;
  percentChange: number;
}

export class FIFOCalculator {
  private purchases: Purchase[] = [];
  private sales: Sale[] = [];

  addPurchase(quantity: number, price: number, timestamp: string) {
    this.purchases.push({ quantity, price, timestamp });
    // Sort by timestamp to maintain FIFO order
    this.purchases.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  addSale(quantity: number, price: number, timestamp: string) {
    this.sales.push({ quantity, price, timestamp });
    // Sort by timestamp
    this.sales.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  calculateFIFOGainLoss(): FIFOResult {
    // Create a copy of purchases to track remaining quantities
    const remainingPurchases = [...this.purchases];
    let totalGainLoss = 0;
    let totalCostBasis = 0;
    let totalSaleValue = 0;

    // Process each sale using FIFO method
    for (const sale of this.sales) {
      let saleQuantityRemaining = sale.quantity;
      const salePrice = sale.price;

      // Apply FIFO: use oldest purchases first
      while (saleQuantityRemaining > 0 && remainingPurchases.length > 0) {
        const oldestPurchase = remainingPurchases[0];
        
        // Determine how much we can use from this purchase
        const quantityToUse = Math.min(saleQuantityRemaining, oldestPurchase.quantity);
        
        // Calculate gain/loss for this portion
        const costBasis = quantityToUse * oldestPurchase.price;
        const saleValue = quantityToUse * salePrice;
        const gainLoss = saleValue - costBasis;
        
        totalGainLoss += gainLoss;
        totalCostBasis += costBasis;
        totalSaleValue += saleValue;
        
        // Update remaining quantities
        saleQuantityRemaining -= quantityToUse;
        oldestPurchase.quantity -= quantityToUse;
        
        // Remove purchase if fully used
        if (oldestPurchase.quantity === 0) {
          remainingPurchases.shift();
        }
      }
    }

    // Calculate percent change
    const percentChange = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    return {
      totalGainLoss,
      percentChange
    };
  }

  // Get current holdings (purchases minus sales)
  getCurrentHoldings(): number {
    const totalPurchased = this.purchases.reduce((sum, p) => sum + p.quantity, 0);
    const totalSold = this.sales.reduce((sum, s) => sum + s.quantity, 0);
    return totalPurchased - totalSold;
  }

  // Reset calculator
  reset() {
    this.purchases = [];
    this.sales = [];
  }
}

// Helper function to create FIFO calculator from transaction history
export function createFIFOFromTransactions(transactions: any[], collectibleId: string): FIFOCalculator {
  const calculator = new FIFOCalculator();
  
  // Filter transactions for specific collectible
  const relevantTransactions = transactions
    .filter(t => t.collectible_id === collectibleId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const transaction of relevantTransactions) {
    const quantity = parseInt(transaction.amount) || 1;
    const price = parseFloat(transaction.price) || 0;
    const timestamp = transaction.timestamp;

    if (transaction.transaction_type === 'buy') {
      calculator.addPurchase(quantity, price, timestamp);
    } else if (transaction.transaction_type === 'sell') {
      calculator.addSale(quantity, price, timestamp);
    }
  }

  return calculator;
}
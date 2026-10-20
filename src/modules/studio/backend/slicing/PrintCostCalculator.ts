export interface IPrintCostInput {
  filamentType: string;
  modelWeightGrams: number;
  printTimeMinutes: number;
  printerWattage?: number; // e.g. 350W
  hasSupport: boolean;
  supportType?: 'tree' | 'normal' | 'none';
  marginMultiplier?: number; // Default 2.5x
}

export interface IPrintCostBreakdown {
  filamentPricePerGram: number;
  modelFilamentCostVnd: number;
  supportWeightGrams: number;
  supportCostVnd: number;
  totalFilamentCostVnd: number;
  powerCostVnd: number;
  depreciationCostVnd: number;
  totalProductionCostVnd: number;
  marginMultiplier: number;
  suggestedSellingPriceVnd: number;
  estimatedProfitVnd: number;
  profitPercentage: number;
}

export class PrintCostCalculator {
  private static FILAMENT_PRICE_PER_GRAM: Record<string, number> = {
    'pla': 220,
    'pla basic': 220,
    'pla matte': 230,
    'pla silk': 300,
    'petg': 250,
    'abs': 280,
    'asa': 320,
    'tpu': 350,
    'tpu 95a': 350,
    'carbon': 480,
    'pla-cf': 480,
    'pa-cf': 650,
    'petg-cf': 520,
  };

  static calculateCost(input: IPrintCostInput): IPrintCostBreakdown {
    const {
      filamentType = 'pla',
      modelWeightGrams = 80,
      printTimeMinutes = 120,
      printerWattage = 350,
      hasSupport = false,
      supportType = 'tree',
      marginMultiplier = 2.5,
    } = input;

    // 1. Đơn giá sợi nhựa theo loại
    const cleanType = filamentType.toLowerCase();
    let pricePerGram = 220; // Default PLA
    for (const [key, price] of Object.entries(this.FILAMENT_PRICE_PER_GRAM)) {
      if (cleanType.includes(key)) {
        pricePerGram = price;
        break;
      }
    }

    // 2. Tiền nhựa mô hình
    const modelFilamentCostVnd = Math.round(modelWeightGrams * pricePerGram);

    // 3. Khối lượng và tiền nhựa Support
    let supportWeightGrams = 0;
    if (hasSupport && supportType !== 'none') {
      // Tree Support tiết kiệm nhựa hơn Normal Support
      const supportRatio = supportType === 'tree' ? 0.22 : 0.38;
      supportWeightGrams = Math.round(modelWeightGrams * supportRatio);
    }
    const supportCostVnd = Math.round(supportWeightGrams * pricePerGram);
    const totalFilamentCostVnd = modelFilamentCostVnd + supportCostVnd;

    // 4. Tiền điện tiêu thụ (Công suất * giờ in * 2.600đ/kWh)
    const hours = printTimeMinutes / 60;
    const kWh = (printerWattage / 1000) * hours;
    const powerCostVnd = Math.round(kWh * 2600);

    // 5. Khấu hao máy in, đầu phun & bảo trì (4.000đ / giờ in)
    const depreciationCostVnd = Math.round(hours * 4000);

    // 6. Tổng giá thành sản xuất (Cost of Goods Sold)
    const totalProductionCostVnd = totalFilamentCostVnd + powerCostVnd + depreciationCostVnd;

    // 7. Giá bán đề xuất dịch vụ in 3D gia công (Làm tròn lên 1.000đ)
    const rawSuggestedPrice = totalProductionCostVnd * marginMultiplier;
    const suggestedSellingPriceVnd = Math.ceil(rawSuggestedPrice / 1000) * 1000;

    // 8. Lợi nhuận ước tính
    const estimatedProfitVnd = Math.max(0, suggestedSellingPriceVnd - totalProductionCostVnd);
    const profitPercentage = totalProductionCostVnd > 0
      ? Math.round((estimatedProfitVnd / suggestedSellingPriceVnd) * 100)
      : 0;

    return {
      filamentPricePerGram: pricePerGram,
      modelFilamentCostVnd,
      supportWeightGrams,
      supportCostVnd,
      totalFilamentCostVnd,
      powerCostVnd,
      depreciationCostVnd,
      totalProductionCostVnd,
      marginMultiplier,
      suggestedSellingPriceVnd,
      estimatedProfitVnd,
      profitPercentage,
    };
  }
}

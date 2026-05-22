/**
 * Enforces strict accounting division rules for academic enrollment plans.
 * Calculates evenly: Math.floor(totalAmount / installmentCount).
 * The remaining fractional amount (remainder) is dynamically appended to the
 * first installment so that total collections match the exact program price.
 */

export interface InstallmentPlanItem {
  installmentNumber: number;
  amount: number;
  dueDate: string;
}

/**
 * Splits a total batch fee into clean, structured installments.
 * 
 * @param totalAmount - The anchor fee of the batch program (must be > 0)
 * @param installmentCount - Number of parts to divide into (must be >= 1)
 * @param startDate - Base date to calculate monthly intervals
 * @returns Array of individual scheduled installment plans
 */
export function calculateInstallments(
  totalAmount: number,
  installmentCount: number,
  batchDurationInMonths: number,
  startDate: string = new Date().toISOString().split('T')[0]
): InstallmentPlanItem[] {
  if (totalAmount <= 0) {
    throw new Error("Total batch amount must be greater than zero to split installments.");
  }
  if (installmentCount < 1) {
    throw new Error("Installment count must represent at least 1 selected installment cycle.");
  }
  if (batchDurationInMonths <= 0) {
    throw new Error("Batch duration must be greater than zero.");
  }

  const baseAmount = Math.floor(totalAmount / installmentCount);
  const remainder = totalAmount - (baseAmount * installmentCount);

  const plans: InstallmentPlanItem[] = [];
  const baseDate = new Date(startDate);
  
  // Calculate gap between each installment in days (assuming 1 month = 30 days)
  // e.g. 10 months * 30 days = 300 days / 4 installments = 75 days per interval
  const totalDays = batchDurationInMonths * 30;
  // User explicitly wants (10 months / 4 EMIs) -> 2.5 months -> 75 days gap
  const gapInDays = installmentCount > 1 ? Math.floor(totalDays / installmentCount) : 0;

  for (let i = 1; i <= installmentCount; i++) {
    // Add remainder to the very first installment to ensure absolute correctness
    const amount = i === 1 ? (baseAmount + remainder) : baseAmount;

    // First installment is due on startDate (Day 0)
    // Subsequent installments are offset by (i - 1) * gapInDays
    const currentDate = new Date(baseDate);
    if (i > 1) {
      currentDate.setDate(currentDate.getDate() + ((i - 1) * gapInDays));
    }

    plans.push({
      installmentNumber: i,
      amount,
      dueDate: currentDate.toISOString().split('T')[0]
    });
  }

  return plans;
}

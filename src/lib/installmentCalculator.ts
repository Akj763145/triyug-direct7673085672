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
  startDate: string = new Date().toISOString().split('T')[0]
): InstallmentPlanItem[] {
  if (totalAmount <= 0) {
    throw new Error("Total batch amount must be greater than zero to split installments.");
  }
  if (installmentCount < 1) {
    throw new Error("Installment count must represent at least 1 selected installment cycle.");
  }

  const baseAmount = Math.floor(totalAmount / installmentCount);
  const remainder = totalAmount - (baseAmount * installmentCount);

  const plans: InstallmentPlanItem[] = [];
  const baseDate = new Date(startDate);

  for (let i = 1; i <= installmentCount; i++) {
    // Add remainder to the very first installment to ensure absolute correctness
    const amount = i === 1 ? (baseAmount + remainder) : baseAmount;

    // Project monthly due dates
    const currentDate = new Date(baseDate);
    currentDate.setMonth(baseDate.getMonth() + (i - 1));

    plans.push({
      installmentNumber: i,
      amount,
      dueDate: currentDate.toISOString().split('T')[0]
    });
  }

  return plans;
}

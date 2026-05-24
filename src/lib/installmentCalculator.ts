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
  startDate: string = new Date().toISOString().split('T')[0],
  percentages?: number[],
  dueDateGapDays?: number
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
  
  if (percentages && percentages.length === installmentCount) {
    const totalPercent = percentages.reduce((a, b) => a + Number(b), 0);
    if (totalPercent !== 100) {
      throw new Error(`Total percentage must be 100, got ${totalPercent}.`);
    }
  }

  const baseAmount = Math.floor(totalAmount / installmentCount);
  const remainder = totalAmount - (baseAmount * installmentCount);

  const plans: InstallmentPlanItem[] = [];
  const baseDate = new Date(startDate);
  
  const totalDays = batchDurationInMonths * 30;
  const gapInDays = dueDateGapDays && dueDateGapDays > 0 
    ? dueDateGapDays 
    : (installmentCount > 1 ? Math.floor(totalDays / installmentCount) : 0);

  let computedAmounts = [];
  if (percentages && percentages.length === installmentCount) {
    let sum = 0;
    for (let i = 0; i < installmentCount - 1; i++) {
        const amt = Math.floor(totalAmount * (Number(percentages[i]) / 100));
        computedAmounts.push(amt);
        sum += amt;
    }
    // Final installment gets the remaining amount
    computedAmounts.push(Math.max(0, totalAmount - sum));
  } else {
    for (let i = 1; i <= installmentCount; i++) {
        computedAmounts.push(i === 1 ? (baseAmount + remainder) : baseAmount);
    }
  }

  for (let i = 1; i <= installmentCount; i++) {
    const amount = computedAmounts[i - 1];

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

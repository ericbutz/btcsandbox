const costs = [20, 25, 25, 90, 60, 100, 180, 180, 300];
const weights = [5, 5, 5, 15, 20, 25, 30, 45, 60];
const minWeightLimit = 40;
const maxWeightLimit = 60;

function findSolutionsWithinRange(costs, weights, minWeightLimit, maxWeightLimit) {
    const n = weights.length;
    const dp = Array.from({ length: n + 1 }, () => Array(maxWeightLimit + 1).fill(Number.MAX_SAFE_INTEGER));
    dp[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        for (let w = 0; w <= maxWeightLimit; w++) {
            if (weights[i - 1] <= w) {
                dp[i][w] = Math.min(dp[i - 1][w], dp[i - 1][w - weights[i - 1]] + costs[i - 1]);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    const solutions = [];
    for (let w = minWeightLimit; w <= maxWeightLimit; w++) {
        if (dp[n][w] !== Number.MAX_SAFE_INTEGER) {
            // Backtrack to find the selected items' indices for this weight
            const selectedIndices = [];
            let currentWeight = w;
            for (let i = n; i > 0 && currentWeight > 0; i--) {
                if (dp[i][currentWeight] !== dp[i - 1][currentWeight]) {
                    selectedIndices.push(i - 1);
                    currentWeight -= weights[i - 1];
                }
            }

            // Calculate the total cost and weight for this solution
            const totalCost = selectedIndices.reduce((sum, index) => sum + costs[index], 0);
            solutions.push({
                weight: w,
                minCost: totalCost,
                selectedIndices: selectedIndices.reverse()
            });
        }
    }

    return solutions;
}

const solutions = findSolutionsWithinRange(costs, weights, minWeightLimit, maxWeightLimit);
solutions.forEach((solution, index) => {
    console.log(`Solution ${index + 1}: Weight - ${solution.weight}, Min Cost - ${solution.minCost}, Selected Indices - ${solution.selectedIndices}`);
});

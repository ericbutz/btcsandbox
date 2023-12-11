const costs =   [20, 25, 25, 90, 60, 100, 180, 180, 300];
const weights = [5,  5,  5,  15, 20, 25,  30,  45,  60];
const weightLimit = 50;

function minimizeCostsMaximizeWeight(costs, weights, weightLimit) {
    const n = weights.length;
    const dp = Array.from({ length: n + 1 }, () => Array(weightLimit + 1).fill(Number.MAX_SAFE_INTEGER));
    dp[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        for (let w = 0; w <= weightLimit; w++) {
            if (weights[i - 1] <= w) {
                dp[i][w] = Math.min(dp[i - 1][w], dp[i - 1][w - weights[i - 1]] + costs[i - 1]);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    // Backtrack to find the selected items' indices
    let w = weightLimit;
    const selectedIndices = [];
    for (let i = n; i > 0 && w > 0; i--) {
        if (dp[i][w] !== dp[i - 1][w]) {
            selectedIndices.push(i - 1);
            w -= weights[i - 1];
        }
    }

    // Calculate the total cost and weight
    const totalCost = selectedIndices.reduce((sum, index) => sum + costs[index], 0);
    const totalWeight = selectedIndices.reduce((sum, index) => sum + weights[index], 0);

    return {
        minCost: totalCost,
        maxWeight: totalWeight,
        selectedIndices: selectedIndices.reverse() // Reverse for the order of selection
    };
}

const result = minimizeCostsMaximizeWeight(costs, weights, weightLimit);
console.log("Minimum Cost:", result.minCost, "Maximum Weight:", result.maxWeight, "Selected Indices:", result.selectedIndices);

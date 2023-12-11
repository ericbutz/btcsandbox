const costs = [20, 25, 25, 90, 60, 100, 180, 180, 300];
const weights = [5, 5, 5, 15, 20, 25, 30, 45, 60];
const weightLimit = 40;

function minimizeCostsMaximizeWeight(costs, weights, weightLimit) {
    const n = weights.length;
    const dp = Array.from({ length: n + 1 }, () => Array(weightLimit + 1).fill(Number.MAX_SAFE_INTEGER));
    dp[0][0] = 0; // Base case: no cost for 0 weight

    for (let i = 1; i <= n; i++) {
        for (let w = 0; w <= weightLimit; w++) {
            // If the current item can be added
            if (weights[i - 1] <= w) {
                dp[i][w] = Math.min(
                    dp[i - 1][w], // Not taking the item
                    dp[i - 1][w - weights[i - 1]] + costs[i - 1] // Taking the item
                );
            } else {
                dp[i][w] = dp[i - 1][w]; // Can't take the item
            }
        }
    }

    // Find the maximum weight without exceeding the weight limit
    let maxWeight = 0;
    for (let w = 0; w <= weightLimit; w++) {
        if (dp[n][w] !== Number.MAX_SAFE_INTEGER) {
            maxWeight = w;
        }
    }

    return {
        minCost: dp[n][maxWeight],
        maxWeight: maxWeight
    };
}

const result = minimizeCostsMaximizeWeight(costs, weights, weightLimit);
console.log("Minimum Cost:", result.minCost, "Maximum Weight:", result.maxWeight);

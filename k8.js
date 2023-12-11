const costs = [20, 25, 25, 90, 60, 100, 180, 180, 300];
const weights = [5, 5, 5, 15, 20, 25, 30, 45, 60];
const minWeightLimit = 40;
const maxWeightLimit = 60;

function findSolutionsWithinRange(costs, weights, minWeightLimit, maxWeightLimit) {
    const n = weights.length;
    const dp = Array(maxWeightLimit + 1).fill(Number.MAX_SAFE_INTEGER);
    dp[0] = 0;

    for (let i = 0; i < n; i++) {
        for (let w = maxWeightLimit; w >= weights[i]; w--) {
            if (dp[w - weights[i]] !== Number.MAX_SAFE_INTEGER) {
                dp[w] = Math.min(dp[w], dp[w - weights[i]] + costs[i]);
            }
        }
    }

    const solutions = [];
    for (let w = maxWeightLimit; w >= minWeightLimit; w--) {
        if (dp[w] !== Number.MAX_SAFE_INTEGER) {
            // Backtrack to find the selected items' indices
            const selectedIndices = [];
            let currentWeight = w;
            for (let i = n - 1; i >= 0 && currentWeight > 0; i--) {
                if (currentWeight >= weights[i] && dp[currentWeight] === dp[currentWeight - weights[i]] + costs[i]) {
                    selectedIndices.push(i);
                    currentWeight -= weights[i];
                }
            }

            // Add solution if it matches a unique weight
            if (solutions.length === 0 || solutions[solutions.length - 1].weight !== w) {
                solutions.push({
                    weight: w,
                    minCost: dp[w],
                    selectedIndices: selectedIndices.reverse()
                });
            }
        }
    }

    return solutions;
}

const solutions = findSolutionsWithinRange(costs, weights, minWeightLimit, maxWeightLimit);
solutions.forEach((solution, index) => {
    console.log(`Solution ${index + 1}: Weight - ${solution.weight}, Min Cost - ${solution.minCost}, Selected Indices - ${solution.selectedIndices}`);
});


/**
Returns:

Solution 1: Weight - 60, Min Cost - 230, Selected Indices - 0,1,2,4,5
Solution 2: Weight - 55, Min Cost - 205, Selected Indices - 0,2,4,5
Solution 3: Weight - 50, Min Cost - 180, Selected Indices - 0,4,5
Solution 4: Weight - 45, Min Cost - 160, Selected Indices - 4,5
Solution 5: Weight - 40, Min Cost - 170, Selected Indices - 0,1,2,5

 */
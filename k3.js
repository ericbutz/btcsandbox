const costs =   [ 20, 25, 25, 90, 60, 100, 180, 180, 300 ]; 
const weights = [  5,  5,  5, 15, 20,  25,  30,  45,  60 ]; 
const minWeight = 30;
let maxWeight = 0;

for (const weight of weights) {
    maxWeight += weight;
}

const minCost = Array(maxWeight + 1).fill(Number.MAX_SAFE_INTEGER);
minCost[0] = 0;

for (let i = 0; i < weights.length; i++) {
    for (let j = maxWeight; j >= weights[i]; j--) {
        if (minCost[j - weights[i]] !== Number.MAX_SAFE_INTEGER) {
            minCost[j] = Math.min(minCost[j], minCost[j - weights[i]] + costs[i]);
        }
    }
}

let answer = Number.MAX_SAFE_INTEGER;
for (let i = minWeight; i <= maxWeight; i++) {
    answer = Math.min(answer, minCost[i]);
}

console.log(answer);

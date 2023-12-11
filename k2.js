

function knapSack(n, costs, weights, target) {
  const MAX = Number.MAX_SAFE_INTEGER;
  let dp = Array.from({ length: target + 1 }, () => Array(n + 1).fill(0));

  for (let t = 0; t <= target; t++) {
      dp[t][0] = MAX;
  }
  for (let i = 0; i <= n; i++) {
      dp[0][i] = MAX;
  }

  for (let t = 1; t <= target; t++) {
      for (let i = 1; i <= n; i++) {
          if (t >= weights[i - 1]) {
              dp[t][i] = Math.min(dp[t][i - 1], dp[t - weights[i - 1]][i - 1] + costs[i - 1]);
          } else {
              dp[t][i] = Math.min(dp[t][i - 1], costs[i - 1]);
          }
      }
  }

  return Math.min(...dp[target]);
}
 

// Driver code 
    var costs = [ 20, 25, 25, 90, 60, 100, 180, 180, 300 ]; 
    var weights = [  5,  5,  5, 15, 20,  25,  30,  45,  60 ]; 
    var target = 40; 
    var n = costs.length; 
    console.log(knapSack(n, costs, weights, target))
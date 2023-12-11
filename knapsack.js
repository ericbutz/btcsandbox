

function knapSack(target , ordi , cost , n) 
{ 
    // Making and initializing dp array 
    var dp = Array(target + 1).fill(0); 

    for (i = 1; i < n + 1; i++) { 
        for (let amount = target; amount >= 0; amount--) { 

            if (ordi[i - 1] <= amount) 

                // Finding the maximum value 
                dp[amount] = Math.max(dp[amount], dp[amount - ordi[i - 1]] + cost[i - 1]); 
                //console.log(`i = ${i}, w = ${w}, dp[w] = ${dp[w]}`)
                process.stdout.write(dp[amount] + ', ');
        } 
        process.stdout.write('\n');
    } 
      
    // Returning the maximum value of knapsack 
    return dp[target]; 
} 

// Driver code 
    var cost = [ 20, 25, 25, 90, 60, 100, 180, 180, 300 ]; 
    var ordi = [  5,  5,  5, 15, 20,  25,  30,  45,  60 ]; 
    var target = 40; 
    var n = cost.length; 
    console.log(knapSack(target, ordi, cost, n))
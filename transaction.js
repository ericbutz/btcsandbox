const bitcoin = require('bitcoinjs-lib');

const inputs = [{
  txid: 'your_previous_txid', // Transaction ID of the input transaction
  vout: 0, // Output index from the previous transaction (usually 0 or 1)
  value: 10000 // Amount in satoshis you are spending from the previous transaction
}];

const outputs = [{
  address: 'recipient_bitcoin_address', // Recipient's Bitcoin address
  value: 9000 // Amount in satoshis you are sending to the recipient
}];

// Create a new transaction

let tx = new bitcoin.TransactionBuilder(network);
inputs.forEach(input => tx.addInput(input.txid, input.vout));
outputs.forEach(output => tx.addOutput(output.address, output.value));

// Sign the transaction
const privateKey = 'your_private_key_here'; // Private key in WIF (Wallet Import Format)
const keyPair = bitcoin.ECPair.fromWIF(privateKey, network);

inputs.forEach((input, index) => {
    tx.sign(index, keyPair);
});

// Build the transaction

let rawTransaction = tx.build().toHex();

// Verify transaction format
try {
  const decodedTransaction = bitcoin.Transaction.fromHex(rawTransaction);
  console.log("Transaction decoded successfully:", decodedTransaction);
} catch (error) {
  console.error("Error in transaction format:", error.message);
}

//Broadcast the transaction

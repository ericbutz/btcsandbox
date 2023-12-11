import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
const ECPair = ECPairFactory(ecc);
import bitcoin from 'bitcoinjs-lib';
import { 
  Axios,
  Config,
  timeout
} from "./util/index.js";
import { segwitkey } from './btc.keys-segwit.js'

const validator = (
  pubkey,
  msghash,
  signature,
) => ECPair.fromPublicKey(pubkey).verify(msghash, signature);

const schnorrValidator = (
  pubkey,
  msghash,
  signature,
) => ecc.verifySchnorr(msghash, pubkey, signature);

export const pbstSegwit = async (network = Config.network.REGTEST) => {

  try {

    /**
        We are going to look for 2 btc woth of UTXOs in the faucet. 
     */
    const amount = 2000000000;  // 2 btc
    const feeAmount = 1000000



    /**
        First, get a list of UTXOs for the address. 
        
        Each UTXO looks like:

          {
            txid: '8e126d789692cb01f9b50ea1d425b4d110da8e922d4a1cf2d8a0060d8fdc2ead',
            vout: 0,
            status: {
              confirmed: true,
              block_height: 277,
              block_hash: '525beab1c94f04cc570e7e6824cd1462cd22bc0573ffddc0a7dd665ef0444775',
              block_time: 1702259496
            },
            value: 2500000000
          }
        
     */

    const listunspent = await Axios("esplora_address::utxo", [Config.faucet.address]);
    const utxos = listunspent.data.result;
    //console.log("listunspent: ", utxos);
    
    /**
        Then, loop through the returned utxos until you have the 
        amount of BTC you are looking for.

        A transaction looks like:

        {
          txid: 'ae98b8864474fbe99da919b11a2611503a0766f785072351919739830429e30d',
          version: 2,
          locktime: 0,
          vin: [ [Object] ],
          vout: [ [Object], [Object] ],
          size: 167,
          weight: 560,
          fee: 0,
          status: {
            confirmed: true,
            block_height: 14,
            block_hash: '55e147f6cc8c2ecc2b4bc3ca239507fef8a424d2e12b884db32e0935c3724fb6',
            block_time: 1702259453
          }
        }

        A transaction input (vin) looks like:

          {
            "txid": "44de56356124ac7e32f7809e658fba38feeae4af8d3108b4f011091f4a404836",
            "vout": 1,
            "prevout": {
              "scriptpubkey": "00146e875336eb27dccd0688ccb58b90d2be697c5df7",
              "scriptpubkey_asm": "OP_0 OP_PUSHBYTES_20 6e875336eb27dccd0688ccb58b90d2be697c5df7",
              "scriptpubkey_type": "v0_p2wpkh",
              "scriptpubkey_address": "bc1qd6r4xdhtylwv6p5gej6chyxjhe5hch0h24599j",
              "value": 13910288
            },
            "scriptsig": "",
            "scriptsig_asm": "",
            "witness": [
              "304402203f0d66ee36e84772042a8df50a390e87faa634bf524464a78928c4a0b11f9dcc02206372adcfad3b7a7c5ccfb79ffcd8cd19f07e6510c743399560e13bff03ef1b0e01",
              "032d5657f20d3aa5f0bf1a7d2d77bef9e77b04648855d881e21e00092f40b68f86"
            ],
            "is_coinbase": false,
            "sequence": 4294967293
          }

        A transaction output (vout) is an array of items like:

          {
            scriptpubkey: '001410cacbc34f4681fddbc68b5be4465d8bdc45c2a7',
            scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 10cacbc34f4681fddbc68b5be4465d8bdc45c2a7',
            scriptpubkey_type: 'v0_p2wpkh',
            scriptpubkey_address: 'bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv',
            value: 2500000000
          }

        In the scriptpubkey_type field we see this is a segwit v0 P2WPKH output. So, it is paying to a public key hash
        with a witness.

        We will use the bitcoin.Psbt class:

        - psbt.addInput(input)
        - psbt.addInputs(inputs)
        - psbt.addOutput(output)
        - psbt.addOutputs(outputs)

        For the Inputs we need:
          {
            hash:                                         - The transaction hash that contains the output
            index:                                        - The index of the output
            witnessUtxo: {
              script: Buffer.from(scriptpubkey, 'hex'),   - A buffer of the scriptpubkey from the transaction output (vout)
              value: 5000000000                           - The value in satoshis from the UTXO output
            }  
          }

        We need an Output for each spend. For Outputs we need:
          {
            script: Buffer (or address: string ??)        - A buffer of the transaction hash that contains the output
            value:                                        - The value in satoshis going to this spend
          }
        
        (Both addInput and addOutput can also include data for updateInput / updateOutput.)
        
        For a list of what attributes should be what types. Check the bip174 library. 
     */

    const psbt = new bitcoin.Psbt({ network });

    const selectedUtxos = [];
    let psbtAmount = 0;
    for (let i = 0; i < utxos.length; i++) {
      let utxo = utxos[i];
      const txInfo = await Axios("esplora_tx",[utxos[i].txid]);
      const witnessUtxo = {
        script: Buffer.from(txInfo.data.result.vout[0].scriptpubkey, 'hex'),
        value: txInfo.data.result.vout[0].value // The value in satoshis
      };
      console.log('txInfo: ', txInfo.data.result.vin[0])
      let input = { hash: utxo.txid, index: 0, witnessUtxo: witnessUtxo };
      psbt.addInput(input)
      psbtAmount = psbtAmount + utxo.value;
      selectedUtxos.push(input);
      if (psbtAmount > amount + feeAmount) {
        break;
      }
    }

    console.log('selectedUtxos: ', selectedUtxos)

    /**
        Now we get a key to send to. We will generate a regtest segwit key with our btc.keys-segwit.js segwitkey method
     */

    const user = await segwitkey(Config.network.REGTEST)
    console.log('user: ', user)
    
    const publicKeyHash = bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(user.childKey.publicKey));

    // Construct the scriptPubKey
    const scriptPubKey = bitcoin.script.compile([
      bitcoin.opcodes.OP_0,
      publicKeyHash
    ]);
    console.log('scriptPubKey: ', scriptPubKey)

    // Amount sent to user
    const sendAmount = psbt.addOutput({
      script: scriptPubKey, 
      value: amount
    })

    console.log('Current transaction outputs: ', psbt.txOutputs)

    // Amount sent back to original sender
    const faucetKey = ECPair.fromWIF(Config.faucet.wif, network)

    const publicKeyHashChange = bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(faucetKey.publicKey));

    // Construct the scriptPubKey
    const scriptPubKeyChange = bitcoin.script.compile([
      bitcoin.opcodes.OP_0,
      publicKeyHashChange
    ]);

    const change = psbt.addOutput({
      script: scriptPubKeyChange, 
      value: psbtAmount - amount - feeAmount
    })

    console.log('amount: ', amount)
    console.log('psbtAmount: ', psbtAmount)
    console.log('output total: ', psbtAmount - feeAmount)
    console.log('input - output: ', psbtAmount - feeAmount)
    console.log('psbtAmount - amount - feeAmount: ', psbtAmount - amount - feeAmount)

    /**
        Signer: There are a few methods. signAllInputs and signAllInputsAsync, which will search all input information for your 
        pubkey or pubkeyhash, and only sign inputs where it finds your info. Or you can explicitly sign a specific input with 
        signInput and signInputAsync. For the async methods you can create a SignerAsync object and use something like a hardware 
        wallet to sign with. (You must implement this) 
        
        Combiner: psbts can be combined easily with psbt.combine(psbt2, psbt3, psbt4 ...) the psbt calling combine will always 
        have precedence when a conflict occurs. Combine checks if the internal bitcoin transaction is the same, so be sure that 
        all sequences, version, locktime, etc. are the same before combining. 
        
        Input Finalizer: This role is fairly important. Not only does it need to construct the input scriptSigs and witnesses, 
        but it SHOULD verify the signatures etc. Before running psbt.finalizeAllInputs() please run psbt.validateSignaturesOfAllInputs() 
        Running any finalize method will delete any data in the input(s) that are no longer needed due to the finalized scripts 
        containing the information. 
        
        Transaction Extractor: This role will perform some checks before returning a Transaction object. Such as fee rate not 
        being larger than maximumFeeRate etc.
     */

    // Sign the first input with the faucet key
    //const faucetKey = ECPair.fromWIF(Config.faucet.wif, network)
    //console.log('keyPairNew: ', keyPairNew)
    // console.log('XXprivateKey: ', faucetKey.privateKey.toString('hex'))
    // console.log('XXpublicKey: ', faucetKey.publicKey.toString('hex'))

    //const signAllInputs = psbt.signInput(0, faucetKey,)
    const signAllInputs = psbt.signAllInputs(faucetKey)
    console.log('signAllInputs: ', signAllInputs.data.outputs);

    //console.log('psbt: ', JSON.stringify(psbt, null, 4))

    // const validateSignaturesOfAllInputs = psbt.validateSignaturesOfAllInputs(validator)
    // console.log('validateSignaturesOfAllInputs: ', validateSignaturesOfAllInputs);

    //const fianlizeInput = psbt.finalizeInput(0);
    const finalizeAllInputs = psbt.finalizeAllInputs()

    console.log('finalizeAllInputs: ', JSON.stringify(finalizeAllInputs, null, 4));


    const transaction = psbt.extractTransaction(true);
    console.log('transaction: ', transaction.toHex());

    const sendrawtransaction = await Axios("btc_sendrawtransaction",[transaction.toHex()]);
    console.log('sendrawtransaction: ', sendrawtransaction.data)

    await timeout(2000);

    let txid = sendrawtransaction.data.result
    console.log('txid: ', txid)

    const esplora_tx_status = await Axios("esplora_tx::status",[sendrawtransaction.data.result]);
    console.log('esplora_tx_status: ', esplora_tx_status.data);

    const info1 = await Axios("esplora_tx",[sendrawtransaction.data.result]);
    console.log('info1: ', info1.data);

    const mempool = await Axios("esplora_mempool:recent", [])
    console.log('mempool: ', mempool.data);

    const genBlock = await Axios("btc_generatetoaddress", [1, Config.faucet.address])
    console.log('genBlock: ', genBlock.data);

    await timeout(2000);

    const mempool2 = await Axios("esplora_mempool:recent", [])
    console.log('mempool: ', mempool2.data);

    console.log('aaa: ', txid)
    const aaa = await Axios("esplora_tx",[txid]);
    console.log('aaa txid: ', aaa.data);

    console.log('aaa txid: ', JSON.stringify(aaa.data, null, 4));

    // const info3 = await Axios("btc_decoderawtransaction",[sendrawtransaction.data.result]);
    // console.log('info3: ', info3.data);

    /**
     * walletcreatefundedpsbt - Creates and funds a transaction in the Partially Signed Transaction format.
     * In "body" the first array is the list of inputs and the second array is the output target address and the amount to send.
     */
    // const body = [
    //   [...selectedUtxos],
    //   [{ bcrt1qc7dnadkgm4te9rv6yywnzr8v7f4d8yc296adrp: 75 }],
    // ];
    // const walletcreatefundedpsbt = await Axios("btc_walletcreatefundedpsbt", body);
    // console.log("walletcreatefundedpsbt: ", walletcreatefundedpsbt.data);
    // const psbt = walletcreatefundedpsbt.data.result.psbt
    // console.log("walletcreatefundedpsbt: ", psbt);

    // /**
    //  * walletprocesspsbt - Updates the PSBT with input information from our wallet and then signs inputs that we can sign for
    //  */
    // const walletprocesspsbt = await Axios("walletprocesspsbt", [psbt]);
    // const processedPbst = walletprocesspsbt.data.result.psbt;
    // console.log("processedPbst: ", processedPbst);

    // /**
    //  * finalizepsbt - Updates the PSBT with input information from our wallet and then signs inputs that we can sign for
    //  */    
    // const finalizepsbt = await Axios("finalizepsbt", [processedPbst]);
    // const finalizedPbstHex = finalizepsbt.data.result.hex;
    // console.log("finalizedPbstHex: ", finalizedPbstHex);

    // /**
    //  * sendrawtransaction - Updates the PSBT with input information from our wallet and then signs inputs that we can sign for
    //  */    
    // const sendrawtransaction = await Axios("sendrawtransaction", [finalizedPbstHex]);
    // const newTxOut = sendrawtransaction.data.result;
    // console.log("sendrawtransaction.data: ", sendrawtransaction.data);
    // console.log("newTxOut: ", newTxOut);

    // const txInfo = await Axios("gettxout", [newTxOut, 0]);
    // console.log('txInfo: ', txInfo.data);

  } catch (error) {
    throw error;
  }
};


await pbstSegwit();
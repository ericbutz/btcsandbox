import * as assert from 'assert';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { describe, it } from 'mocha';
import bitcoin from 'bitcoinjs-lib';
//import { regtestUtils } from './_regtest';

import { RegtestUtils } from 'regtest-client';
const regtestUtils = new RegtestUtils({ APIURL: 'http://localhost:3000/v1/regtest' });
const regtest = regtestUtils.network;

const ECPair = ECPairFactory(ecc);
//const rng = require('randombytes');
import { BIP32Factory } from 'bip32';
const bip32 = BIP32Factory(ecc);

const validator = (
  pubkey,
  msghash,
  signature,
) => ECPair.fromPublicKey(pubkey).verify(msghash, signature);

// See bottom of file for some helper functions used to make the payment objects needed.

describe('bitcoinjs-lib (transactions with psbt)', () => {
  it('can create a 1-to-1 Transaction', () => {
    const alice = ECPair.fromWIF(
      'L2uPYXe17xSTqbCjZvL2DsyXPCbXspvcu5mHLDYUgzdUbZGSKrSr',
    );
    const psbt = new bitcoin.Psbt();
    psbt.setVersion(2); // These are defaults. This line is not needed.
    psbt.setLocktime(0); // These are defaults. This line is not needed.
    psbt.addInput({
      // if hash is string, txid, if hash is Buffer, is reversed compared to txid
      hash: '7d067b4a697a09d2c3cff7d4d9506c9955e93bff41bf82d439da7d030382bc3e',
      index: 0,
      sequence: 0xffffffff, // These are defaults. This line is not needed.

      // non-segwit inputs now require passing the whole previous tx as Buffer
      nonWitnessUtxo: Buffer.from(
        '0200000001f9f34e95b9d5c8abcd20fc5bd4a825d1517be62f0f775e5f36da944d9' +
          '452e550000000006b483045022100c86e9a111afc90f64b4904bd609e9eaed80d48' +
          'ca17c162b1aca0a788ac3526f002207bb79b60d4fc6526329bf18a77135dc566020' +
          '9e761da46e1c2f1152ec013215801210211755115eabf846720f5cb18f248666fec' +
          '631e5e1e66009ce3710ceea5b1ad13ffffffff01' +
          // value in satoshis (Int64LE) = 0x015f90 = 90000
          '905f010000000000' +
          // scriptPubkey length
          '19' +
          // scriptPubkey
          '76a9148bbc95d2709c71607c60ee3f097c1217482f518d88ac' +
          // locktime
          '00000000',
        'hex',
      ),

      // // If this input was segwit, instead of nonWitnessUtxo, you would add
      // // a witnessUtxo as follows. The scriptPubkey and the value only are needed.
      witnessUtxo: {
        script: Buffer.from(
          '76a9148bbc95d2709c71607c60ee3f097c1217482f518d88ac',
          'hex',
        ),
        value: 90000,
      },

      // Not featured here:
      //   redeemScript. A Buffer of the redeemScript for P2SH
      //   witnessScript. A Buffer of the witnessScript for P2WSH
    });
    psbt.addOutput({
      address: '1KRMKfeZcmosxALVYESdPNez1AP1mEtywp',
      value: 80000,
    });
    psbt.signInput(0, alice);
    psbt.validateSignaturesOfInput(0, validator);
    psbt.finalizeAllInputs();
    assert.strictEqual(
      psbt.extractTransaction().toHex(),
      '02000000013ebc8203037dda39d482bf41ff3be955996c50d9d4f7cfc3d2097a694a7' +
        'b067d000000006b483045022100931b6db94aed25d5486884d83fc37160f37f3368c0' +
        'd7f48c757112abefec983802205fda64cff98c849577026eb2ce916a50ea70626a766' +
        '9f8596dd89b720a26b4d501210365db9da3f8a260078a7e8f8b708a1161468fb2323f' +
        'fda5ec16b261ec1056f455ffffffff0180380100000000001976a914ca0d36044e0dc' +
        '08a22724efa6f6a07b0ec4c79aa88ac00000000',
    );
  });

  it('can create (and broadcast via 3PBP) a typical Transaction', async () => {
    // these are { payment: Payment; keys: ECPair[] }
    const alice1 = createPayment('p2pkh');
    const alice2 = createPayment('p2pkh');

    // give Alice 2 unspent outputs
    const inputData1 = await getInputData(
      5e4,
      alice1.payment,
      false,
      'noredeem',
    );
    const inputData2 = await getInputData(
      7e4,
      alice2.payment,
      false,
      'noredeem',
    );
    {
      const {
        hash, // string of txid or Buffer of tx hash. (txid and hash are reverse order)
        index, // the output index of the txo you are spending
        nonWitnessUtxo, // the full previous transaction as a Buffer
      } = inputData1;
      assert.deepStrictEqual({ hash, index, nonWitnessUtxo }, inputData1);
    }

    // network is only needed if you pass an address to addOutput
    // using script (Buffer of scriptPubkey) instead will avoid needed network.
    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData1) // alice1 unspent
      .addInput(inputData2) // alice2 unspent
      .addOutput({
        address: 'mwCwTceJvYV27KXBc3NJZys6CjsgsoeHmf',
        value: 8e4,
      }) // the actual "spend"
      .addOutput({
        address: alice2.payment.address, // OR script, which is a Buffer.
        value: 1e4,
      }); // Alice's change
    // (in)(5e4 + 7e4) - (out)(8e4 + 1e4) = (fee)3e4 = 30000, this is the miner fee

    // Let's show a new feature with PSBT.
    // We can have multiple signers sign in parrallel and combine them.
    // (this is not necessary, but a nice feature)

    // encode to send out to the signers
    const psbtBaseText = psbt.toBase64();

    // each signer imports
    const signer1 = bitcoin.Psbt.fromBase64(psbtBaseText);
    const signer2 = bitcoin.Psbt.fromBase64(psbtBaseText);

    // Alice signs each input with the respective private keys
    // signInput and signInputAsync are better
    // (They take the input index explicitly as the first arg)
    signer1.signAllInputs(alice1.keys[0]);
    signer2.signAllInputs(alice2.keys[0]);

    // If your signer object's sign method returns a promise, use the following
    // await signer2.signAllInputsAsync(alice2.keys[0])

    // encode to send back to combiner (signer 1 and 2 are not near each other)
    const s1text = signer1.toBase64();
    const s2text = signer2.toBase64();

    const final1 = bitcoin.Psbt.fromBase64(s1text);
    const final2 = bitcoin.Psbt.fromBase64(s2text);

    // final1.combine(final2) would give the exact same result
    psbt.combine(final1, final2);

    // Finalizer wants to check all signatures are valid before finalizing.
    // If the finalizer wants to check for specific pubkeys, the second arg
    // can be passed. See the first multisig example below.
    assert.strictEqual(psbt.validateSignaturesOfInput(0, validator), true);
    assert.strictEqual(psbt.validateSignaturesOfInput(1, validator), true);

    // This step it new. Since we separate the signing operation and
    // the creation of the scriptSig and witness stack, we are able to
    psbt.finalizeAllInputs();

    // build and broadcast our RegTest network
    await regtestUtils.broadcast(psbt.extractTransaction().toHex());
    // to build and broadcast to the actual Bitcoin network, see https://github.com/bitcoinjs/bitcoinjs-lib/issues/839
  });

})

function createPayment(_type, myKeys, network) {
  network = network || regtest;
  const splitType = _type.split('-').reverse();
  const isMultisig = splitType[0].slice(0, 4) === 'p2ms';
  const keys = myKeys || [];
  let m;
  if (isMultisig) {
    const match = splitType[0].match(/^p2ms\((\d+) of (\d+)\)$/);
    m = parseInt(match[1], 10);
    let n = parseInt(match[2], 10);
    if (keys.length > 0 && keys.length !== n) {
      throw new Error('Need n keys for multisig');
    }
    while (!myKeys && n > 1) {
      keys.push(ECPair.makeRandom({ network }));
      n--;
    }
  }
  if (!myKeys) keys.push(ECPair.makeRandom({ network }));

  let payment;
  splitType.forEach(type => {
    if (type.slice(0, 4) === 'p2ms') {
      payment = bitcoin.payments.p2ms({
        m,
        pubkeys: keys.map(key => key.publicKey).sort((a, b) => a.compare(b)),
        network,
      });
    } else if (['p2sh', 'p2wsh'].indexOf(type) > -1) {
      payment = (bitcoin.payments)[type]({
        redeem: payment,
        network,
      });
    } else {
      payment = (bitcoin.payments)[type]({
        pubkey: keys[0].publicKey,
        network,
      });
    }
  });

  return {
    payment,
    keys,
  };
}

function getWitnessUtxo(out) {
  delete out.address;
  out.script = Buffer.from(out.script, 'hex');
  return out;
}

async function getInputData(
  amount,
  payment,
  isSegwit,
  redeemType,
) {
  const unspent = await regtestUtils.faucetComplex(payment.output, amount);
  const utx = await regtestUtils.fetch(unspent.txId);
  // for non segwit inputs, you must pass the full transaction buffer
  const nonWitnessUtxo = Buffer.from(utx.txHex, 'hex');
  // for segwit inputs, you only need the output script and value as an object.
  const witnessUtxo = getWitnessUtxo(utx.outs[unspent.vout]);
  const mixin = isSegwit ? { witnessUtxo } : { nonWitnessUtxo };
  const mixin2 = {};
  switch (redeemType) {
    case 'p2sh':
      mixin2.redeemScript = payment.redeem.output;
      break;
    case 'p2wsh':
      mixin2.witnessScript = payment.redeem.output;
      break;
    case 'p2sh-p2wsh':
      mixin2.witnessScript = payment.redeem.redeem.output;
      mixin2.redeemScript = payment.redeem.output;
      break;
  }
  return {
    hash: unspent.txId,
    index: unspent.vout,
    ...mixin,
    ...mixin2,
  };
}
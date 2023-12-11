
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);
const TESTNET = bitcoin.networks.testnet;



// process.env.TABLE_NAME,

const keyPair = ECPair.makeRandom();
const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
const pubkey = keyPair.publicKey
console.log("Public Key: ", pubkey);
console.log("Address: ", address);
/**
 * These keys can be confirmed in the Ian Coleman html page.
 *   Coin: BTC
 *   BIP32 Derivation Path tab
 *   BIP32 Derivation Path: m/84'/0'/0'/0
 */

import bip39 from 'bip39';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
const bip32 = BIP32Factory(ecc);
import bitcoin from 'bitcoinjs-lib';
import {Config} from './util/index.js'

export const segwitkey = async (network = Config.BITCOIN) => {
  const mnemonic = 'valley alien library bread worry brother bundle hammer loyal barely dune brave'
  const seed = await bip39.mnemonicToSeed(mnemonic);  // returns a buffer
  const rootKey = bip32.fromSeed(seed, network);

  const child = rootKey.derivePath(Config.derivePath.SEGWIT_HD_PATH);

  // BIP32 Extended Private Key
  const xprv = child.toBase58();

  // Select the number of the derived address
  const childKey = bip32.fromBase58(xprv, network).derive(1)

  const privateKey = childKey.privateKey.toString('hex');
  const publicKey = childKey.publicKey.toString('hex');
  const wifKey = childKey.toWIF();

  //const p2pkh = bitcoin.payments.p2pkh({ pubkey: childKey.publicKey, network: BITCOIN }); // Nested Segwit (BIP49)

  const { address, output } = bitcoin.payments.p2wpkh({ pubkey: childKey.publicKey, network: network }); // Segwit / bech32 (BIP84)

  //const p2tr = bitcoin.payments.p2tr({ pubkey: childKey.publicKey, network: BITCOIN }); // Nested Segwit (BIP49)

  console.log('\n\nMnemonic:', mnemonic);
  console.log('\nBIP32 Extended Private Key: ', xprv)
  console.log('\nPublic Key:', publicKey);
  console.log('\nPrivate Key:', privateKey);
  console.log('\nwif: ', wifKey)
  console.log('\nSegwit address: ', address)
  console.log('')

  return {
    mnemonic,
    xprv,
    childKey,
    publicKey,
    privateKey,
    wifKey,
    address
  }
}

segwitkey();
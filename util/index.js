import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const Config = {
  faucet: {
    mnemonic: 'hub dinosaur mammal approve riot rebel library legal sick discover loop alter',
    address: "bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv",
    privateKey: 'a747c379010e89e402e25d63d7fdfc5fbf45b5cfff52891398b258bf6d700b5c',
    publicKey: '03d3af89f242cc0df1d7142e9a354a59b1cd119c12c31ff226b32fb77fa12acce2',
    wif: 'cTBsa8seu4xA7EZ7N2AXeq2qUfrVsD2KS3F7Tj72WKaXF15hp7Vq'
  },

  derivePath: {
    // "m / purpose' / coin_type' / account' / change"
    LEGACY_HD_PATH: "m/44'/0'/0'/0",  // Legacy btc
    NESTED_SEGWIT_HD_PATH: "m/49'/0'/0'/0",  // BIP49 - P2WPKH-nested-in-P2SH (addresses starting with 3
    SEGWIT_HD_PATH: "m/84'/0'/0'/0",  // BIP84 - Native bech32 Segwit - P2WPKH (addresses starting with bc1q)
    TAPROOT_HD_PATH: "m/86'/0'/0'/0"  // BIP86 - P2TR (addresses starting with bc1p)
  },

  network: {
    // For Bitcoin mainnet keys
    BITCOIN: {
      messagePrefix: '\x18Bitcoin Signed Message:\n',
      bech32: 'bc',
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
      },
      pubKeyHash: 0x00,
      scriptHash: 0x05,
      wif: 0x80,
    },

    REGTEST: {
      messagePrefix: '\x18Bitcoin Signed Message:\n',
      bech32: 'bcrt',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394
      },
      pubKeyHash: 0x6f,
      scriptHash: 0xc4,
      wif: 0xef
    }
  }
}

export const Axios = async (method, parameter = []) => {
  const RPC_URL = process.env.URL;
  console.log('rpc: ', RPC_URL)

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: method,
    params: parameter
  };

  console.log('body: ', body)

  try {
    const response = await axios.post(RPC_URL, body);
    return response;
  } catch (error) {
    throw error;
  }
};

export const InitChain = async () => {
  const blockCount = await Axios("getblockcount",[]);
  if (blockCount.data.result > 200) return;
  const body = [
    200,
    Config.faucet
  ];
  try {
    const transaction = await Axios("generatetoaddress", body);
    console.log('Init chain: ', transaction.data.result)
  } catch (error) {
    throw error;
  }
};

export const randStr = async (len) => {
  var charset = "abcdefghijklmnopqrstuvwxyz";
  result="";
  for( var i=0; i < len; i++ )
      result += charset[Math.floor(Math.random() * charset.length)];
  return result
}

export async function timeout(ms) {
  await new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
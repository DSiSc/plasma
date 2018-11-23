const ethUtil = require('ethereumjs-util')

/**
 * Creates a new transaction object.
 *
 * @example
 * var rawTx = {
 *   utxoId: '0x01212',
 *   utxoValue: '0x11',
 *   newOwner: '0x2710',
 *   amount: '0x11',
 *   sigs: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057'
 * };
 * var tx = new Transaction(rawTx);
 *
 * @class
 * @param {Buffer | Array | Object} data a transaction can be initiailized with either a buffer containing the RLP serialized transaction or an array of buffers relating to each of the tx Properties, listed in order below in the exmple.
 *
 * Or lastly an Object containing the Properties of the transaction like in the Usage example.
 *
 * For Object and Arrays each of the elements can either be a Buffer, a hex-prefixed (0x) String , Number, or an object with a toBuffer method such as Bignum
 *
 * @property {Buffer} raw The raw rlp encoded transaction
 * @param {Buffer} data.utxoId utxoId
 * @param {Buffer} data.utxoValue utxoValue
 * @param {Buffer} data.newOwner newOwner
 * @param {Buffer} data.amount amount
 * @param {Buffer} data.sigs sigs
 * */

class Transaction {
  constructor (data) {
    data = data || {}
    // Define Properties
    const fields = [{
      name: 'utxoId',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'utxoValue',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'newOwner',
      alias: 'gas',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'amount',
      allowZero: true,
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'sigs',
      length: 130,
      allowZero: true,
      allowLess: true,
      default: new Buffer([])
    }]

    /**
     * Returns the rlp encoding of the transaction
     * @method serialize
     * @return {Buffer}
     * @memberof Transaction
     * @name serialize
     */
    // attached serialize
    ethUtil.defineProperties(this, fields, data)
  }

  /**
   * Computes a sha3-256 hash of the serialized tx
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash (includeSignature) {
    if (includeSignature === undefined) includeSignature = true

    // EIP155 spec:
    // when computing the hash of a transaction for purposes of signing or recovering,
    // instead of hashing only the first six elements (ie. nonce, gasprice, startgas, to, value, data),
    // hash nine elements, with v replaced by CHAIN_ID, r = 0 and s = 0

    let items
    if (includeSignature) {
      items = this.raw
    } else {
        items = this.raw.slice(0, 4)
    }

    // create hash
    return ethUtil.rlphash(items)
  }

  /**
   * sign a transaction with a given private key
   * @param {Buffer} privateKey
   */
  sign (privateKey) {
    const msgHash = this.hash(false)
    const sig = ethUtil.ecsign(msgHash, privateKey)
    return sig
  }
}

module.exports = Transaction
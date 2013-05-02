'use strict';
/** @fileOverview Javascript implementation of streaming integrity using sha256.
 *
 * Proof of concept not meant for any practical use.
 * Not very memory efficient and may cause unacceptable blocking.
 *
 * This is an implementation of an algorithm using sha256 to ensure integrity while streaming
 * a large file (e.g. video) by not requiring a recipient to receive the entire file
 * until the integrity may be verified. The file can instead be sent and verified block-by-block
 * and therefore enables streaming of files while still ensuring their total integrity.
 *
 * This is not a very practical implementation since it requires the file to be read and hashed
 * entirely before it can be sent in blocks, causing high memory consumption and possibly blocking
 * the server for relatively long periods of time.
 *
 * @author John Granström
 */
var crypto = require('crypto'),
    fs = require('fs');

/*
 * Streamsha object for lifetime of hashing and streaming operation
 * @constructor
 * @class Streamsha
 */
exports.Streamsha = function Streamsha() {};

exports.Streamsha.prototype = {
    constructor: exports.Streamsha,
    /*
     * The block size to split data into, in bytes.
     * @constant
     */
    dataBlockSize: 1024,

    /*
     * Hash output size, in bytes.
     * @constant
     */
    hashSize: 32,

    /*
     * The resulting buffer of the hash.
     */
    hashedBuffer: null,

    /*
     * Read a file and hash its content for streaming.
     * Unfortunately we need to load the entire file into memory
     * before hashing can start since it's required by the algorithm.
     *
     * Callback is called with resulting hash and data buffer when done.
     * @param {string|object} options Path to file or options for hash including encoding.
     * @param {function} [callback] The function to be called when hashing is successful or error.
     * @return this
     */
    //hashFile: function(file, callback, encoding) {
    hashFile: function(options, callback) {
        options = options.path ? options : { path: options };
        var self = this;
        fs.readFile(options.path, function(err, data) {
            if(err) return callback(err);
            var hash = self._hashData(data);
            var encoding = options.encoding;
            return callback(null, encoding ? hash.toString(encoding) : hash, self.hashedBuffer);
        });
        return this;
    },

    /*
     * Hash a data buffer by splitting it into blocks n of size <= 1024 bytes and hashing
     * each individual block i = n - 1 with sha256 and appending the result to the block i - 1
     * until the first block i = 0 is hashed and the result finally is returned by the function.
     *
     * Each resulting block will be of size <= 1056 bytes.
     * @param {Buffer} data The data to split and hash.
     * @return {Buffer} The resulting final hash.
     */
    _hashData: function(data) {
        var blockCount = data.length / this.dataBlockSize,
            remainder = blockCount % 1,
            fullBlockCount = remainder === 0 ? blockCount : Math.ceil(blockCount) - 1,
            lastBlockSize = remainder * this.dataBlockSize,
            i = data.length - lastBlockSize,
            r = i,
            rBlockSize = this.dataBlockSize + this.hashSize,
            sbuf,
            hash;

        // Initialize result Buffer
        this.hashedBuffer = new Buffer(fullBlockCount * (this.dataBlockSize + this.hashSize) + lastBlockSize);

        // Do last block separately with dynamic length
        sbuf = data.slice(i); // i to end
        hash = this._hashAndDigest(sbuf);
        sbuf.copy(this.hashedBuffer, r, 0);

        // Hash remaining blocks
        for(i -= this.dataBlockSize; i >= 0; i-= this.dataBlockSize, r -= rBlockSize) {
            // Create a buffer for (block || hash) and copy data into it
            sbuf = new Buffer(rBlockSize);
            data.copy(sbuf, 0, i, i + this.dataBlockSize);
            hash.copy(sbuf, this.dataBlockSize);

            // Add data to hashed buffer
            sbuf.copy(this.hashedBuffer, r);

            hash = this._hashAndDigest(sbuf); // Update the hash
        }

        return hash;
    },

    /*
     * Immediately compute and return the hash of a provided buffer.
     * @param {Buffer} buffer The buffer to hash.
     * @return {Buffer} The has of the provided buffer.
     */
    _hashAndDigest: function(buffer) {
        return crypto.createHash('sha256').update(buffer).digest();
    }
};
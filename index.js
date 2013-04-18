/* Usage for the file test.mp4 */
new (require('./lib/streamsha').Streamsha)().hashFile('test.bin', function(hash, buffer) {
    console.log(hash);
    console.log(buffer);
}, 'hex');
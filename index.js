/* Usage for the file test.mp4 */
new (require('./lib/streamsha').Streamsha)().hashFile({ path: 'test.bin', encoding: 'hex' }, 
	function(err, hash, buffer) {
		if(err) throw err;
    console.log(hash);
    console.log(buffer);
});
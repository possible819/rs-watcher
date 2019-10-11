var fs = require('fs');

module.exports = () => {
  const ENCODING = 'utf8';
  const confFileBaseDir = './conf/rs-watcher.conf';
  var config = JSON.parse(fs.readFileSync(confFileBaseDir), ENCODING);
  return config;
};

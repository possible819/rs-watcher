// Read configuration fils
global.CONF = require('./modules/read-configuration')();
var scheduler = require('./modules/scheduler');
var rule = scheduler.setScheduleRule();
scheduler.runScheduleRule(rule);
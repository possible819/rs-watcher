var schedule = require('node-schedule');
var moment = require('moment');
var fs = require('fs');
moment.locale('ko');
var osUtils = require('os-utils');
var diskUsage = require('diskusage');
var mailSender = require('./mail-sender');

const CPU_ALERT = 'cpuAlert';
const MEM_ALERT = 'memAlert';
const DISK_ALERT = 'diskAlert';

const LOG_BASE_DIR = './logs/';
const CPU_LOG_FILE = 'cpu-alert.log';
const MEM_LOG_FILE = 'memory-alert.log';
const DISK_LOG_FILE = 'disk-alert.log';

var rsScheduler = {
  setScheduleRule: function() {
    var watchInterval = 10;
    if(!watchInterval) {
      throw 'Check interval is not defined. Please check check-interval.json file.';
    } else if (watchInterval < 0 || watchInterval > 60) {
      throw 'Check interval is not in valid range. Please check check-interval.json file.';
    }

    var secs = [];
    var count = 60 / watchInterval;

    for(var i = 1; i <= count; i++ ) {
      secs.push(watchInterval * i);
    }

    if(secs[secs.length - 1] === 60) {
      secs[secs.length - 1] = 0;
    }


    var schedulerRule = new schedule.RecurrenceRule();
    schedulerRule.second = secs;

    return schedulerRule;
  },

  runScheduleRule: function(rule) {
    var rsMonitorScheduler = schedule.scheduleJob(rule, () => {
      global.CONF = require('./read-configuration')();
      var limits = global.CONF.limits;
      var receivers = global.CONF.receivers;

      // CPU 사용량 체크
      osUtils.cpuUsage(cpuUsage => {
        var currentCpuUsage = cpuUsage * 100;

        if(global.CONF.info.logActive) {
          this.showCurrentStatus({
            type: CPU_ALERT,
            usage: currentCpuUsage,
            dateTime: moment().format('LL') + ' ' + moment().format('LTS')
          });
        }

        if(limits.cpu <= currentCpuUsage) {
          this.sendMail({
            receivers: receivers,
            type: CPU_ALERT,
            usage: currentCpuUsage
          });
        }
      });

      // Memory 사용량 체크
      var currentMemUsage = 100 - osUtils.freememPercentage() * 100;
      if(global.CONF.info.logActive) {
        this.showCurrentStatus({
          type: MEM_ALERT,
          usage: currentMemUsage,
          dateTime: moment().format('LL') + ' ' + moment().format('LTS')
        });
      }

      if(limits.memory <= currentMemUsage) {
        this.sendMail({
          receivers: receivers,
          type: MEM_ALERT,
          usage: currentMemUsage
        });
      }

      // Disk 사용량 체크
      let diskRootPath = osUtils.platform() === 'win32' ? 'c:' : '/';
      diskUsage.check(diskRootPath, (error, diskUsage) => {
        let currentDiskUsage = (diskUsage.total - diskUsage.free) / diskUsage.total * 100;

        if(global.CONF.info.logActive) {
          this.showCurrentStatus({
            type: DISK_ALERT,
            usage: currentDiskUsage,
            dateTime: moment().format('LL') + ' ' + moment().format('LTS')
          });
        }

        if(limits.storage <= currentDiskUsage) {
          this.sendMail({
            receivers: receivers,
            type: DISK_ALERT,
            usage: currentDiskUsage
          });
        }

      });
    });
  },

  sendMail: function(opts) {
    let alertType = opts.type;
    opts.usage = this.getUsage(opts.usage);

    if(alertType === CPU_ALERT) {
      if(this.checkMailSendable(CPU_ALERT)) {
        mailSender.sendMail(opts);
        this.writeMailSentAt(CPU_ALERT);
      }

    } else if (alertType === MEM_ALERT) {
      if(this.checkMailSendable(MEM_ALERT)) {
        mailSender.sendMail(opts);
        this.writeMailSentAt(MEM_ALERT);
      }
    } else if (alertType === DISK_ALERT) {
      if(this.checkMailSendable(DISK_ALERT)) {
        mailSender.sendMail(opts);
        this.writeMailSentAt(DISK_ALERT);
      }
    }
  },

  checkMailSendable: function(type) {
    var fileFullPath = this.getLogFilePath(type);
    var sendable = false;
    var mailSendAt = fs.readFileSync(fileFullPath, 'utf8');
    var limitTime;

    if(!mailSendAt) {
      mailSendAt = moment(new Date()).toDate();
      limitTime = moment(new Date(mailSendAt)).toDate();
    } else {
      limitTime = moment(new Date(mailSendAt)).add(global.CONF.interval.mailSendIntervalMin, 'minutes').toDate();
    }

    var currentDateTime = moment(new Date()).toDate();
    if(currentDateTime > limitTime) {
      sendable = true;
    }

    if(global.CONF.info.logActive) {
      console.log('Last mail was sent at ' + moment(new Date(mailSendAt)).locale('ko').format('LLLL'));
      console.log('Now it\'s ' + moment(new Date(mailSendAt)).locale('ko').format('LLLL') + ' & time limit is ' + global.CONF.interval.mailSendIntervalMin + ' mins');
      console.log('Mail sendable is : ' + sendable);
    }

    return sendable;
  },

  writeMailSentAt: function(type) {
    var fileFullPath = this.getLogFilePath(type);
    fs.writeFileSync(fileFullPath, moment(new Date()).toString(), 'utf8');
  },

  getLogFilePath: function(type) {
    var logFile = (type === CPU_ALERT) ? CPU_LOG_FILE : (type === MEM_ALERT) ? MEM_LOG_FILE : (type === DISK_ALERT) ? DISK_LOG_FILE : null;
    return LOG_BASE_DIR + logFile;
  },

  showCurrentStatus: function(opt) {
    var usage = this.getUsage(opt.usage);
    
    if(opt.type === CPU_ALERT) {
      console.log('CPU Usage: ' + usage + '% checked at: ' + opt.dateTime);
    } else if (opt.type === MEM_ALERT) {
      console.log('Memory Usage: ' + usage + '% checked at: ' + opt.dateTime);
    } else if (opt.type === DISK_ALERT) {
      console.log('Disk Usage: ' + usage + '% checked at: ' + opt.dateTime);
    }
  },

  getUsage: function(usage) {
    let usageStr = usage.toString();
    return usageStr.slice(0, usageStr.indexOf('.') + 3);
  }
};

module.exports = rsScheduler;

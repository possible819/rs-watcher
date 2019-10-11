var mailer = require('nodemailer');
var moment = require('moment');
const CPU_ALERT = 'cpuAlert';
const MEM_ALERT = 'memAlert';
const DISK_ALERT = 'diskAlert';

var sender = mailer.createTransport({
  service: global.CONF.mailer.service,
  auth: {
    user: global.CONF.mailer.user,
    pass: global.CONF.mailer.pwd
  }
});

var mailSender = {

  sendMail: function(opts) {
    let alertType = opts.type;
    let receivers = opts.receivers;

    let mailOptions = this.getMailOptions(opts);
    let activedRecievers = this.getActivedReceivers(receivers);

    activedRecievers.forEach(receiver => {
      mailOptions.to = receiver.mail;

      sender.sendMail(mailOptions, (error, info) => {
        if(error) {
          throw error;
        } else {
          console.log(alertType + ' Mail to ' + receiver.mail + ' succesfully sent at: ' + moment().format('LL') + ' ' + moment().format('LTS'));
        }

        sender.close();
      });
    });
  },

  getMailOptions: function(options) {
    let alertType = options.type;
    let mailOptions = {
      from: global.CONF.mailer.user
    };

    let nickName = global.CONF.info.nickname;
    let ip = global.CONF.info.ip;

    if(CPU_ALERT === alertType) {
      mailOptions.subject = '[' + nickName + '] 서버 CPU 사용량 경고.';
      mailOptions.html = '<h3>[' + nickName + '] ' + 'CPU 사용량이 ' + options.usage + ' %에 도달 했습니다.</h3><br>' +
                         '<table>' +
                         '  <tr>' +
                         '    <td>서버 명칭</td>' +
                         '    <td>' + nickName + '</td>' +
                         '  </tr>' +
                         '  <tr>' +
                         '    <td>IP 주소</td>' +
                         '    <td>' + ip + '</td>' +
                         '  </tr>' +
                         '</table>';

    } else if (MEM_ALERT === alertType) {

      mailOptions.subject = '[' + nickName + '] 서버 Memory 사용량 경고.';
      mailOptions.html = '<h3>[' + nickName + '] ' + 'Memory 사용량이 ' + options.usage + ' %에 도달 했습니다.</h3><br>' +
                         '<table>' +
                         '  <tr>' +
                         '    <td>서버 명칭:</td>' +
                         '    <td>' + nickName + '</td>' +
                         '  </tr>' +
                         '  <tr>' +
                         '    <td>IP 주소:</td>' +
                         '    <td>' + ip + '</td>' +
                         '  </tr>' +
                         '</table>';
    } else if (DISK_ALERT === alertType) {
      mailOptions.subject = '[' + nickName + '] 서버 Disk 사용량 경고.';
      mailOptions.html = '<h3>[' + nickName + '] ' + 'Disk 사용량이 ' + options.usage + ' %에 도달 했습니다.</h3><br>' +
                         '<table>' +
                         '  <tr>' +
                         '    <td>서버 명칭:</td>' +
                         '    <td>' + nickName + '</td>' +
                         '  </tr>' +
                         '  <tr>' +
                         '    <td>IP 주소:</td>' +
                         '    <td>' + ip + '</td>' +
                         '  </tr>' +
                         '</table>';
    }

    return mailOptions;
  },

  getActivedReceivers: function(receivers) {
    let activedRecievers = receivers.filter(receiver => {
      if(receiver.active) {
        return receiver;
      }
    });

    return activedRecievers;
  }
};

module.exports = mailSender;

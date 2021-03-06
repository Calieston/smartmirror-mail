'use strict';
var Imap = require('imap'),
  util = require('util'),
  MailParser = require("mailparser").MailParser;

exports.get = function(params) {
  // Return new Promise
  return new Promise((resolve, reject) => {
    let user = params.user
    let password = params.password
    let host = 'imap.gmail.com'
    const mailData = []

    var imap = new Imap({
      user: user,
      password: password,
      host: host,
      port: 993,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false
      },
      authTimeout: 3000
    });

    function openInbox(cb) {
      imap.openBox('INBOX', true, cb);
    }

    // create a connection
    imap.connect();

    // handle connection error event
    imap.once('error', function(err) {
      console.log(err);
    });

    // handle disconnect event
    imap.once('end', function() {
      console.log('Connection ended');
      resolve(mailData.reverse());
    });

    // call execute function after established connection
    imap.once('ready', () => {
      console.log('imap connected');
      openInbox((err, box) => {
        if (err) throw err;

        imap.search(['UNSEEN', ], (err, results) => {
          if (err) throw err;
          var f = imap.fetch(results, {
            bodies: ["HEADER.FIELDS (FROM SUBJECT)", ""]
          });
          if (err) throw err;

          f.on("message", processMessage);

          f.once('error', function(err) {
            console.log('Fetch error: ' + err);
          });

          f.once('end', function() {
            imap.end();
          });

        });

      });
    });

    // parse mail body with mail parser
    function processMessage(msg, seqno) {
      var parser = new MailParser();
      parser.on("end", function(msg) {
        // push parsed mail into mail array
        var d = new Date(msg.headers.date);
        var datestring = d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
        datestring += ', ' + d.getHours() + ':' + d.getMinutes();
        msg.headers.date = datestring;
        mailData.push(msg);
      });

      msg.on("body", function(stream) {
        stream.on("data", function(chunk) {
          parser.write(chunk.toString("utf8"));
        });
      });
      msg.once("end", function() {
        parser.end();
      });
    }
  });
};
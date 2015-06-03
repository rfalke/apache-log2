"use strict";

var assert = require("assert");
var os = require("os");
var fs = require("fs");
var http = require("http");
var request = require('request');

var apache_log = require("../lib/apache-log");

var port = 4173;

function rm_r(dir) {
    fs.readdirSync(dir).forEach(function (name) {
        name = dir + "/" + name;
        if (fs.statSync(name).isDirectory()) {
            rm_r(name);
        } else {
            fs.unlinkSync(name);
        }
    });
    fs.rmdirSync(dir);
}

describe('logging', function () {
    var tmpDir;

    beforeEach(function () {
        tmpDir = os.tmpdir() + "/testing_" + os.uptime();
        fs.mkdirSync(tmpDir);
    });
    afterEach(function () {
        rm_r(tmpDir);
    });
    it("simple full trip test with real http server and client", function (done) {
        apache_log.data.settings({directory: tmpDir});
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.end(req.url);
        });
        server.listen(port);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            if (!error && response.statusCode === 200) {
                assert.equal(body, "/abcdef");
                server.close();
                var line = fs.readFileSync(tmpDir + "/access.log").toString();
                assert.equal(line.indexOf("127.0.0.1 - - ["), 0);
                assert.ok(line.indexOf('] "GET /abcdef HTTP/1.1" 200 7 "-" "undefined"\n') > 0);
                done();
            }
        });
    });
});

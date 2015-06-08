"use strict";

var assert = require("assert");
var os = require("os");
var fs = require("fs");
var http = require("http");
var request = require('request');
var sinon = require('sinon');

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
    var output_name;

    beforeEach(function () {
        tmpDir = os.tmpdir() + "/testing_" + os.uptime();
        fs.mkdirSync(tmpDir);
        output_name = tmpDir + "/access.log";
    });
    afterEach(function () {
        rm_r(tmpDir);
    });
    function read_log() {
        var line = fs.readFileSync(tmpDir + "/access.log").toString();
        line = line.replace(new RegExp("[0-9][0-9]/[A-Z][a-z][a-z]/20[0-9][0-9]:[0-9][0-9]:[0-9][0-9]:[0-9][0-9] \\+0000"), "DATE");
        return line;
    }

    it("simple full trip test with real http server and client", function (done) {
        apache_log.configure(output_name, "combined");
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.end(req.url);
        });
        server.listen(port);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            if (!error && response.statusCode === 200) {
                assert.equal(body, "/abcdef");
                server.close();
                assert.equal(read_log(), '127.0.0.1 - - [DATE] "GET /abcdef HTTP/1.1" 200 7 "-" "-"\n');
                done();
            }
        });
    });
    it("write(data)+end(data)", function (done) {
        apache_log.configure(output_name, "combined");
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.write("1234");
            res.end(req.url);
        });
        server.listen(port);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            if (!error && response.statusCode === 200) {
                assert.equal(body, "1234/abcdef");
                server.close();
                assert.equal(read_log(), '127.0.0.1 - - [DATE] "GET /abcdef HTTP/1.1" 200 11 "-" "-"\n');
                done();
            }
        });
    });
    it("write(data)+end()", function (done) {
        apache_log.configure(output_name, "combined");
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.write(req.url);
            res.end();
        });
        server.listen(port);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            if (!error && response.statusCode === 200) {
                assert.equal(body, "/abcdef");
                server.close();
                assert.equal(read_log(), '127.0.0.1 - - [DATE] "GET /abcdef HTTP/1.1" 200 7 "-" "-"\n');
                done();
            }
        });
    });
    it("write(data)+write(data)+end()", function (done) {
        apache_log.configure(output_name, "combined");
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.write("1234");
            res.write(req.url);
            res.end();
        });
        server.listen(port);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            if (!error && response.statusCode === 200) {
                assert.equal(body, "1234/abcdef");
                server.close();
                assert.equal(read_log(), '127.0.0.1 - - [DATE] "GET /abcdef HTTP/1.1" 200 11 "-" "-"\n');
                done();
            }
        });
    });
    it("end(buffer)", function (done) {
        apache_log.configure(output_name, "combined");
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.end(new Buffer(req.url));
        });
        server.listen(port);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            if (!error && response.statusCode === 200) {
                assert.equal(body, "/abcdef");
                server.close();
                assert.equal(read_log(), '127.0.0.1 - - [DATE] "GET /abcdef HTTP/1.1" 200 7 "-" "-"\n');
                done();
            }
        });
    });
    it("write(buffer)+end()", function (done) {
        apache_log.configure(output_name, "combined");
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.write(new Buffer(req.url));
            res.end();
        });
        server.listen(port);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            if (!error && response.statusCode === 200) {
                assert.equal(body, "/abcdef");
                server.close();
                assert.equal(read_log(), '127.0.0.1 - - [DATE] "GET /abcdef HTTP/1.1" 200 7 "-" "-"\n');
                done();
            }
        });
    });
    it("timestamp format", function (done) {
        apache_log.configure(output_name, "combined");
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.write(new Buffer(req.url));
            res.end();
        });
        server.listen(port);
        var clock = sinon.useFakeTimers(819808496000);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            clock.restore();
            if (!error && response.statusCode === 200) {
                assert.equal(body, "/abcdef");
                server.close();
                var parts = fs.readFileSync(tmpDir + "/access.log").toString().split(" ");
                assert.equal(parts[3], '[24/Dec/1995:12:34:56');
                assert.equal(parts[4], '+0000]');
                done();
            }
        });
    });
    it("timestamp format leading zeros", function (done) {
        apache_log.configure(output_name, "combined");
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.write(new Buffer(req.url));
            res.end();
        });
        server.listen(port);
        var clock = sinon.useFakeTimers(791690645006);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            clock.restore();
            if (!error && response.statusCode === 200) {
                assert.equal(body, "/abcdef");
                server.close();
                var parts = fs.readFileSync(tmpDir + "/access.log").toString().split(" ");
                assert.equal(parts[3], '[02/Feb/1995:02:04:05');
                assert.equal(parts[4], '+0000]');
                done();
            }
        });
    });
    it("common format", function (done) {
        apache_log.configure(output_name, "common");
        var server = http.createServer(function (req, res) {
            apache_log.logger(req, res);
            res.end(req.url);
        });
        server.listen(port);
        request('http://localhost:' + port + '/abcdef', function (error, response, body) {
            if (!error && response.statusCode === 200) {
                assert.equal(body, "/abcdef");
                server.close();
                assert.equal(read_log(), '127.0.0.1 - - [DATE] "GET /abcdef HTTP/1.1" 200 7\n');
                done();
            }
        });
    });


});

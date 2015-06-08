/* Copyright 2013 Robert Edward Steckroth II <RobertSteckroth@gmail.com> Bust0ut, Surgemcgee

 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

var sprintf = require('sprintf').sprintf,
    fs = require('fs');

var month = [];
month[0] = "January";
month[1] = "February";
month[2] = "March";
month[3] = "April";
month[4] = "May";
month[5] = "June";
month[6] = "July";
month[7] = "August";
month[8] = "September";
month[9] = "October";
month[10] = "November";
month[11] = "December";

var format = 'combined';
var output_path = '/var/log/access.log';
var output_stream = false;

function open_or_update_file() {
    if (output_stream) {
        fs.closeSync(output_stream);
    }
    output_stream = fs.openSync(output_path, 'a');
}

function format_date(timeStamp) {
    return sprintf("%02d/%s/%02d:%02d:%02d:%02d +0000",
        timeStamp.getUTCDate(),
        month[timeStamp.getMonth()].substr(0, 3),
        timeStamp.getUTCFullYear(),
        timeStamp.getUTCHours(),
        timeStamp.getUTCMinutes(),
        timeStamp.getUTCSeconds()
    );
}

function get_username(request) {
    var username = "-";
    if (request.session && request.session.user) {
        username = request.session.user;
    } else if (request.session && request.session.id) {
        username = request.session.id;
    }
    return username;
}

function get_remote_ip(request) {
    return request.headers['X-Forwarded-For'] || request.connection.remoteAddress || "Unknown IP Address";
}

function get_protocol(request) {
    if (request.connection.encrypted) {
        return "HTTPS";
    }
    return "HTTP";
}

function responseEnd(request, responseBodyLen, responseStatusCode) {
    var common_log = sprintf('%s - %s [%s] "%s %s %s/%s" %s %s',
        get_remote_ip(request), get_username(request), format_date(new Date()),
        request.method,
        request.url,
        get_protocol(request),
        request.httpVersion,
        responseStatusCode,
        responseBodyLen
    );

    var combined = "";
    if (format === 'combined') {
        combined = sprintf(' "%s" "%s"',
                request.headers.referer || request.headers.referrer || "-",
                request.headers['user-agent'] || "-"
        );
    }

    if (output_stream === false) {
        open_or_update_file();
    }
    fs.write(output_stream, common_log + combined + "\n");
}

function get_length(data) {
    if (Buffer.isBuffer(data)) {
        return data.length;
    }
    if (typeof data === 'string') {
        return Buffer.byteLength(data);
    }
    throw new Error("bad case");
}

function logger(request, response) {
    var origEnd = response.end;
    var origWrite = response.write;
    var written = 0;
    var toIgnore;
    response.write = function (data) {
        origWrite.apply(this, arguments);
        if (data !== toIgnore) {
            written += get_length(data);
        }
    };
    response.end = function (data) {
        toIgnore = data;
        origEnd.apply(this, arguments);
        toIgnore = undefined;
        if (data !== undefined) {
            written += get_length(data);
        }
        var responseBodyLen = written;
        var responseStatusCode = response.statusCode;
        responseEnd(request, responseBodyLen, responseStatusCode);
    };
    response.write.prototype = origWrite.prototype;
    response.end.prototype = origEnd.prototype;
}

function configure(new_path, new_format) {
    if (!(new_format === "common" || new_format === "combined")) {
        throw new Error("Unknown format: " + new_format);
    }
    format = new_format;
    output_path = new_path;
    output_stream = false;
}

module.exports = {
    logger: logger,
    configure: configure
};

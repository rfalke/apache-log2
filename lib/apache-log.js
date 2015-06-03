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

var sprintf = require('sprintf').sprintf,
    Object_parse = require('object-parse')
    fs = require('fs'),
    path = require('path'),
    fd = false
    

var apache_log = function(){}

module.exports = apache_log 

apache_log.data = new Object_parse()

apache_log.data.options({ 
    appname: [''],
    debug: [true, false],
    format: ['combined', 'common'], 
    directory: ['/var/log/'], 
    filename: ['access.log'],
})


function log(message) {
    apache_log.data.settings().debug && console.log("["+apache_log.data.settings().appname+"] "+message)
}


apache_log.data.on('settings_changed', function() {
            if ( fd )
                fs.close(fd||null, function(){
                    fd = fs.openSync(path.join(apache_log.data.settings().directory, apache_log.data.settings().filename), 'a')
                })
            else
                fd = fs.openSync(path.join(apache_log.data.settings().directory, apache_log.data.settings().filename), 'a')
            
        })


apache_log.data.settings({appname: 'Apache-log'})

apache_log.logger = function(request, response) {
    var resEndOld = response.end // Creates a copy of the response object end method
	// We will override the response objects end method to provide access to the internal function scope
    response.end = function(data, encoding) { 
        resEndOld.apply(this, arguments)  // Extend the original end object with the new response prototype
        var responseBodyLen = (data && Buffer.byteLength(data)) || "-"
		var responseStatusCode = response.statusCode
		responseEnd(request, response, responseBodyLen, responseStatusCode) // Call the logging function with internal response scoping varables
    }
    response.end.prototype = resEndOld.prototype // Add the original prototype (which was extended) to the new response prototype
}


function responseEnd(request, response, responseBodyLen, responseStatusCode) {
	var username = "-";
	if ( request.session && request.session.user ) // get username (if available)
		username = request.session.user
    else if ( request.session && request.session.id ) 
		username = request.session.id;
    /*  // If we ever get a time stamp in the headers set it to this and calculate
    var timeStamp = new Date(req.headers['date'])
    var time_zone_offset = timeStamp.getTimezoneOffset()
	var plus_or_minus = time_zone_offset < 1 ? "+" : "-"

	if ( time_zone_offset < 0 )
	    time_zone_offset *= -1
	var time_zone_hours = Math.floor(time_zone_offset/60)
	time_zone_hours = time_zone_hours.toString().length < 2 ? "0"+time_zone_hours : time_zone_hours
	var time_zone_minutes = time_zone_offset%60
	time_zone_minutes = time_zone_minutes.toString().length < 2 ? "0"+time_zone_minutes : time_zone_minutes */
    var timeStamp = new Date()
    var common_log = sprintf("%s - %s [%s/%s/%s:%s:%s:%s %s]",
  		request.headers['X-Forwarded-For'] || request.connection.remoteAddress || "Unknown IP Address", // IP, username, or not
  		username,
  		timeStamp.getUTCDate().toString().length < 2 ? '0'+timeStamp.getUTCDate() : timeStamp.getUTCDate(),
  		month[timeStamp.getMonth()].substr(0, 3),
  		timeStamp.getUTCFullYear(),
  		timeStamp.getUTCHours().toString().length < 2 ? '0'+timeStamp.getUTCHours() : timeStamp.getUTCHours(),
  		timeStamp.getUTCMinutes().toString().length < 2 ? '0'+timeStamp.getUTCMinutes() : timeStamp.getUTCMinutes(),
  		timeStamp.getUTCSeconds().toString().length < 2 ? '0'+timeStamp.getUTCSeconds() : timeStamp.getUTCSeconds(),
        "+0000" //	plus_or_minus+time_zone_hours+""+time_zone_minutes
	)
    	
  	var common_log_2 = sprintf('"%s %s %s/%s" %s %s', 
  			request.method,
  			request.url,
  			request.connection.encrypte && "HTTPS" || "HTTP",
  			request.httpVersion,
  	 	 	responseStatusCode,
  			responseBodyLen
  	)
  	
    var combined = ""
    if ( apache_log.data.settings().format === 'combined' )
        combined = sprintf('"%s" "%s"', 
     	   request.headers['referer'] || request.headers['referrer'] || "-",
	 	   request.headers['user-agent']
        )

    if ( !fd ) {
        log('Options/settings are mis-configured. Logs will not be created.')
        return
    }
    fs.write( fd, common_log+" "+common_log_2+" "+combined+"\n" )
}


var month = []
month[0]="January"
month[1]="February"
month[2]="March"
month[3]="April"
month[4]="May"
month[5]="June"
month[6]="July"
month[7]="August"
month[8]="September"
month[9]="October"
month[10]="November"
month[11]="December"



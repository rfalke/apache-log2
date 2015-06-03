# apache-log2
## Apache/CLF access logging for Nodejs
  
 [![NPM](https://nodei.co/npm/apache-log2.png?downloads=true)](https://nodei.co/npm/apache-log2/)

**Author:** Raimar Falke

**Licence:** GNU GENERAL PUBLIC LICENSE Version 3
 
**Dependencies:**  [object-parse](https://npmjs.org/package/object-parse/), [sprintf](https://npmjs.org/package/sprintf/)

**Based on:** the work of Robert Edward Steckroth II <RobertSteckroth@gmail.com> aka Surgemcgee / Bustout 

**Description:**  

Outputs NodeJs request/response event logs with a Apache/CLF format. Supports common and combined log formats. Licensed under the GNU v3.

**Features:**   

* Automatic Content-length computations  
* Activated when a response.end is called
* Does not require middleware, e.g. express or connect
* Defaults to Apache2 log formatting defaults
* Does not require a call to writeHead to output with CLF conformity

**Caveats:**  

* Will not compute time zone information. Many clf analyzers use geoip given this is a common problem.

_example output line of combined log_  
``127.0.0.1 - - [10/Aug/2013:22:18:19 +0000] "GET /?f=sabl1vpghojkc8dre7j1n&s=+yhoo+goog HTTP/1.1" 200 687 "-" "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/28.0.1500.71 Chrome/28.0.1500.71 Safari/537.36"``

**Usage:**  

````
    var apache_log = require('apache-log2')
    http.createServer(function(req, res) {
      apache_log.logger(req, res)
      res.writeHead(200, {'Content-Type': 'text/html'} )
      res.end('This is when the logger will output to the specified log file.') 
    }).listen(8080)
    
````

**Settings:**

Set simple options with the [object-parse](https://npmjs.org/package/object-parse/) syntax

````
 apache_log.data.settings({
    directory: '/var/log/apache2/',
    filename: 'access.log',
    format: 'combined',
    }, apache_log.data.cli_parse()) // parse the cli input as well see [object-parse](https://npmjs.org/package/object-parse/) for details


````

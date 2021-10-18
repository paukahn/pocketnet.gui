var _ = require('lodash');
var useragent = require('express-useragent');
var f = require('../functions');

var Middle = function(){

    var self = this

    var countlogs = 10000
    var logs = []

    var addLogs = function(parameters, ip, status, pathname, start){
		
		logs.push({
			p : _.clone(parameters),
			ip : ip,
			s : status,
			pn : pathname,
			date : new Date(),
            start : start
		})

		var d = logs.length - countlogs

		if (d > countlogs / 1000){
			logs = logs.slice(d)
		}
    }

    self.clear = function(){
        logs = []
    }

    var rate = function(){

        var eventschecktime = 10000

        var s = f.date.addseconds(new Date(), - eventschecktime / 1000)
        var l = logs.length
        var c = 0

        if(l){
            while (l && logs[l - 1].date > s){
                c++
                l--
            }
        }

        return c / (eventschecktime / 1000)
    }
    
    self.info = function(compact){
        
        var requestsIp = _.toArray(f.group(logs, function(l){
            return l.ip
        })).length

        var byCodes = {}

        var rpclogs = _.filter(logs, function(l){
            if(l.pn && l.pn.indexOf('rpc/') > -1){
                return true
            }
        })        
        _.each(f.group(rpclogs, function(l){

            return l.s

        }), function(lc, code){

            byCodes[code] = {
                length : lc.length,
                code : code
            }

        })

        var signatures = {}

        _.each(f.group(logs, function(l){
            if(f.deep(l, 'p.signature')){
                return 'exist'
            }
            else{
                return 'empty'
            }
        }), function(lc, code){

            signatures[code] = {
                length : lc.length,
                code : code
            }

        })

        var data = {
            requestsIp : requestsIp,
            responses : byCodes,
            signatures : signatures,
            rate : rate()
        }

        if(!compact) data.logs = logs

        return data
    }

    self.getlogs = function(){
        return logs
    }

  
    self.headers = function(request, result, next){
        result.setHeader('Access-Control-Allow-Origin', '*');
        result.setHeader("Access-Control-Allow-Methods", "GET, POST");
        result.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

        if (next) 
            next(null)
    }

    self.extendlight = function(request, result, next){
        
        result._success = function(data, code){
            if(!code) code = 200
            result.status(code).jsonp({
                result : 'success',
                data : data
            })
        }
    
        result._fail = function(error, code){

            if(!code) code = 500
            if(code < 100) code = 500

            result.status(code).jsonp({
                error : error,
                code : code
            })
        }
    
        if (next)
            next(null)
    
    }

    self.extend = function(request, result, next){
        var start = f.now()
        
        result._success = function(data, code){

            if(!code) code = 200

            result.status(code).jsonp({
                result : 'success',
                data : data
            })

            addLogs(request.data, request.clientIP, code, request.baseUrl + request.path, start)
    
        }
    
        result._fail = function(error, code){

            if(!code) code = 500

            if(code < 100) code = 500

            result.status(code).jsonp({
                error : error,
                code : code
            })

            addLogs(request.data, request.clientIP, code, request.baseUrl + request.path, start)
    
        }
    
        if (next)
            next(null)
    
    }
    
    self.data = function(request, result, next){
     
        request.data = _.merge(request.query, request.body)
        
        _.each(request.data, function(v, key){
    
            if(v && v[0] && (v[0] == "{" || v[0] == "[")){
                try{
                    request.data[key] = JSON.parse(v)
                }
                catch(e){
                    
                }
            }
        })

        request.data.ip = request.clientIP
        request.data.ua = request.clientUA || {}
        delete request.data.U
        delete request.data.A

        if (next)
            next(null)
    }
    
    self.bearer = function(request, result, next){
    
        if (request.headers){
            var s = request.headers['authorization'] || '';
            var apikey = s.replace('Bearer ', '') || ''
    
            if(!request.data) request.data = {}
    
            if (apikey){
                request.data.apikey = apikey  
            }
        }
    
        if (next) 
            next(null)
    }
    
    self.uainfo = function(request, result, next){
    
        if(!request.headers) return

        var ua = {}
    
        var source = request.headers['user-agent'];

        if (source){
            ua = useragent.parse(source);
        }
    
        var ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress || "::1";
    
        request.clientIP = ip
        //request.clientUA = ua
    
        if (next) 
            next(null)
    }

    self.lightnext = function(request, result, next){

        var n = false
        if(request){
            n = request.originalUrl ==  '/ping'
        }

        if(n) {

            self.extendlight(request, result)
            self.headers(request, result)
            next(null)
        }

        return n
    }
    
    self.prepare = function(request, result, next){

        if(self.lightnext(request, result, next)) return

        self.headers(request, result)
        self.uainfo(request, result)
        self.data(request, result)
        self.extend(request, result)
        self.bearer(request, result)
    
        if (next) 
            next(null)
    }

    

    return self
}

module.exports = Middle
var plugin = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');
time = require('time')(Date);
moment = require('moment');
log = common.log('notifier:api');
(function (plugin) {
    //write api call
    plugins.register("/i", function(ob){
        var params = ob.params;
        var now = Math.round(new Date().getTime()/1000);
        var ts = (params.qstring.timestamp) ? parseInt(params.qstring.timestamp) : now;
        var device = {};
        device.id = params.qstring.device_id || "";
        var location = {};
        location.ip = params.ip_address;
        var version = "";
        common.db.collection('app_users' + params.app_id).findOne({'_id':params.app_user_id}, function (err, result) {
            if(err)
                console.log(err);
            else if(result){
                if(result.d)
                    device.d = result.d;
                if(result.p)
                    device.p = result.p;
                if(result.pv)
                    device.pv = result.pv;

                if(result.cc)
                    location.cc = result.cc;
                if(result.cty)
                    location.cty = result.cty;
                version = result.av || version;
            }
            var known = false;
            if (params.qstring.begin_session) {
                known = true;
                var type = "session";
                var info = {"begin_session":params.qstring.begin_session};
                //store session
                common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {

                    //count sessions
                    var startDay=Math.round(moment().startOf('day').unix()/1000);
                    var numberOfSessions=0;

                    common.db.collection('app_event' + params.app_id).find({ts:{$gt:startDay,$lt:now}}).count(function(err, count) {

                        log.d(count);

                        if(count>50)
                        {
                            var notification={};
                            notification.event={};
                            notification.event.total_session_count_reached=true;
                            log.d("a number of sessions reached");
                            plugins.dispatch("/listener", {params:params,notification:notification});
                        }
                    });




                });

            }
            if (params.qstring.session_duration) {
                known = true;
                var type = "session";
                var info = {"session_duration":params.qstring.session_duration};
                common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
            }
            if (params.qstring.end_session) {
                known = true;
                var type = "session";
                var info = {"end_session":params.qstring.end_session};
                common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
            }
            if (params.qstring.metrics) {
                known = true;
                var type = "metrics";
                var info = params.qstring.metrics;
                common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
            }
            if (params.qstring.events) {
                known = true;
                var events = params.qstring.events;
                if(events.constructor === Array)
                    for (var i=0; i < events.length; i++) {
                        var type = "event";
                        var info = events[i];
                        common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
                    }
                else{
                    var type = "event";
                    var info = events;
                    common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
                }

            }
            if (params.qstring.user_details) {
                known = true;
                var type = "user_details";
                var info = params.qstring.user_details;
                common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
            }
            if (params.qstring.crash) {
                known = true;
                var type = "crash";
                var info = params.qstring.crash;
                common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
            }
            if(!known){
                var type = "unknown";
                var info = {};
                for(var i in params.qstring){
                    if(i != "app_key" && i != "device_id" && i != "ip_address" && i != "timestamp")
                        info[i] = params.qstring[i];
                }
                common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
            }
        });
    });


}(plugin));

module.exports = plugin;
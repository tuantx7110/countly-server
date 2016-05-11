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
                //check the number of account reached 100 today
                common.db.collection('app_event' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {

                    //count sessions
                    var startDay=Math.round(moment().startOf('day').unix()/1000);
                    var numberOfSessions=0;

                    common.db.collection('app_event' + params.app_id).find({'ts':{$gt:startDay,$lt:now},'i.begin_session':{$ne:null}}).count(function(err, count) {

                        log.d(count);

                        if(count>100)
                        {
                            var notification={};
                            notification.event={};
                            notification.event.total_session_count_reached=true;
                            log.d("a number of sessions reached");
                            plugins.dispatch("/listener", {params:params,notification:notification});
                        }
                    });
                });

                //check if session have user property ""platform"="android"
                if(device.p.toLowerCase()=="android")
                {
                    var notification={};
                    notification.event={};
                    notification.event.session_with_user_property=true;
                    plugins.dispatch("/listener", {params:params,notification:notification});
                }


            }

            if (params.qstring.events) {
                log.d("run here 1");
                known = true;
                var events = params.qstring.events;
                if(events.constructor === Array) {
                    var iter=0
                    for (var i = 0; i < events.length; i++) {
                        var type = "event";
                        var info = events[i];
                        //check if event play and segmentation with Character =Jon
                        common.db.collection('app_event' + params.app_id).insert({
                            ts: ts,
                            reqts: now,
                            d: device,
                            l: location,
                            v: version,
                            t: type,
                            i: info
                        }, function () {
                            if (info.key.toLowerCase() == 'play' && info.segmentation && info.segmentation['Character'] == 'John') {

                                iter=iter+1;
                                if (iter == events.length) {
                                    var startDay = Math.round(moment().startOf('day').unix() / 1000);
                                    common.db.collection('app_event' + params.app_id).aggregate([
                                        {
                                            $match: {
                                                'i.segmentation.Character': 'John',
                                                "i.key":"Play",
                                                'ts':{$gt:startDay,$lt:now}

                                            }
                                        },
                                        {
                                            $group: {
                                                '_id': null,
                                                'total': {
                                                    $sum: '$i.sum'
                                                }
                                            }
                                        }

                                    ], function (err, result) {
                                        if(err)log.d(err);
                                        if (!err && result) {
                                            log.d(JSON.stringify(result));
                                            if(result[0].total>7)
                                            {
                                                //send notification to listener
                                                var notification = {};
                                                notification.event = {};
                                                notification.event.custem_event_segmentation = true;
                                                plugins.dispatch("/listener", {
                                                    params: params,
                                                    notification: notification
                                                });
                                            }

                                        }

                                    });

                                }
                            }

                        });

                    }
                }
                else{
                    log.d("run here 2");
                    var type = "event";
                    var info = events;

                    common.db.collection('app_event' + params.app_id).insert({
                        ts: ts,
                        reqts: now,
                        d: device,
                        l: location,
                        v: version,
                        t: type,
                        i: info
                        }, function () {
                        if (info.key.toLowerCase() == 'play' && info.segmentation && info.segmentation['Character'] == 'John') {

                                var startDay = Math.round(moment().startOf('day').unix() / 1000);
                                common.db.collection('app_event' + params.app_id).aggregate([
                                    {
                                        $match: {
                                            'i.segmentation.Character': 'John',
                                            "i.key":"Play",
                                            'ts':{$gt:startDay,$lt:now}

                                        }
                                    },
                                    {
                                        $group: {
                                            '_id': null,
                                            'total': {
                                                $sum: '$i.sum'
                                            }
                                        }
                                    }

                                ], function (err, result) {
                                    if(err)log.d(err);
                                    if (!err && result) {
                                        log.d(JSON.stringify(result));
                                        if(result[0].total>7)
                                        {
                                            //send notification to listener
                                            var notification = {};
                                            notification.event = {};
                                            notification.event.custem_event_segmentation = true;
                                            plugins.dispatch("/listener", {
                                                params: params,
                                                notification: notification
                                            });
                                        }

                                    }

                                });

                        }

                    });

                }

            }

        });
    });


}(plugin));

module.exports = plugin;
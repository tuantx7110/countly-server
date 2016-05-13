var plugin = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');
var time = require('time')(Date);
var moment = require('moment');
var log = common.log('notifier:api');

var listener =require('./listener');

cron = require("crontab");
path = require("path");
var dir = path.resolve(__dirname, '');
var logpath = path.resolve(__dirname, '../../../log/notifier-api.log');

var crontab;
function convertToTimezone(props){
    //convert time
    var date = new time.Date();
    var serverOffset = date.getTimezoneOffset();
    date.setTimezone(props.timezone);
    var clientOffset = date.getTimezoneOffset()
    var diff = serverOffset - clientOffset;
    var day = props.day;
    var hour = props.hour - Math.floor(diff/60);
    var minute = props.minute - diff%60;

    if(minute < 0){
        minute = 60 + minute;
        hour--;
    }
    else if(minute > 59){
        minute = minute - 60;
        hour++;
    }

    if(hour < 0){
        hour = 24 + hour;
        day--;
    }
    else if(hour > 23){
        hour = hour - 24;
        day++;
    }

    if(day < 1){
        day = 7 + day;
    }
    else if(day > 7){
        day = day - 7;
    }

    props.r_day = day;
    props.r_hour = hour;
    props.r_minute = minute;
}

function createCronjob(id, props,file){

    var job = crontab.create('nodejs '+dir+'/'+file+" "+id+' >>'+logpath+' 2>&1');
    job.comment(id);
    job.minute().at(props.r_minute);
    job.hour().at(props.r_hour);
    if(props.frequency == "weekly"){
        job.dow().at(props.r_day);
    }

}

function saveCronjob(callback){
    crontab.save(callback);

}

function deleteCronjob(id,file){
    crontab.remove({command:'nodejs '+dir+'/'+file+" "+id+' >> '+logpath+' 2>&1', comment:id});

}


//Create crontab for daily process at specific second and minute

cron.load(function(err, tab){
    crontab = tab;
    if(err)log.d(err);
    if(crontab)
    {

        var id1="daily_prcocess_1";
        var id2="dail_process_2";
        var props={};
        props.frequency =  "daily"
        props.minute =59
        props.hour = 14
        props.day = 0
        props.timezone = time.Date.timezone;
        convertToTimezone(props);
        log.d("run in daily notifier");
        var file1="process_daily_users_have_7_sessions_today.js";
        var file2="process_daily_users_dont_have_sessions_7days.js";


        createCronjob(id1,props,file1);
        createCronjob(id2,props,file2);
        
        saveCronjob(function(err, crontab){
            if(err)
            {
                lod.d(err);
            }
            else {
                log.d("successful create crontab");
            }

        });
    }
    else
    {
        log.d("don have crontab")
    }
});




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
                    var startDay=Math.round(moment().startOf('day').unix());
                    var numberOfSessions=0;

                    common.db.collection('app_event' + params.app_id).find({'ts':{$gt:startDay,$lt:now},'i.begin_session':{$ne:null}}).count(function(err, count) {

                        log.d(count);

                        if(count>=100)
                        {
                            var notification={};
                            notification.event={};
                            notification.event.total_session_count_reached=true;

                            listener.receive( {params:params,notification:notification});
                        }
                    });
                });

                //check if session have user property ""platform"="ios"
                if(device.p.toLowerCase()=="ios")
                {
                    var notification={};
                    notification.event={};
                    notification.event.session_with_user_property=true;

                    listener.receive( {params:params,notification:notification});
                }


            }

            if (params.qstring.events) {

                known = true;
                var events = params.qstring.events;
                if(events.constructor === Array) {
                    var iter=0
                    for (var i = 0; i < events.length; i++) {
                        var type = "event";
                        var info = events[i];

                        common.db.collection('app_event' + params.app_id).insert({
                            ts: ts,
                            reqts: now,
                            d: device,
                            l: location,
                            v: version,
                            t: type,
                            i: info
                        }, function () {
                            //check if event play and segmentation with Character =Jon
                            iter=iter+1;
                            if (info.key.toLowerCase() == 'play' && info.segmentation && info.segmentation['Character'] == 'John') {

                                if (iter == events.length) {
                                    var startDay = Math.round(moment().startOf('day').unix());
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

                                            if(result[0].total>10)
                                            {
                                                //send notification to listener
                                                var notification = {};
                                                notification.event = {};
                                                notification.event.custem_event_segmentation = true;
                                                listener.receive( {params:params,notification:notification});
                                                
                                            }

                                        }

                                    });

                                }
                            }

                        });

                    }
                }
                else{

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

                                var startDay = Math.round(moment().startOf('day').unix());
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

                                        if(result[0].total>10)
                                        {
                                            //send notification to listener
                                            var notification = {};
                                            notification.event = {};
                                            notification.event.custem_event_segmentation = true;
                                            listener.receive( {params:params,notification:notification});
                                            
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
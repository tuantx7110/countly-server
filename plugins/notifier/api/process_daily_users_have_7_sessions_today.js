//get command line arguments (skip node and file arguments)
var myArgs = process.argv.slice(2);
var async = require('async');
var listener =require('./listener');
//check if we have an id
if(myArgs[0]){
    //start db connection
    var plugins = require('../../pluginManager.js');
    var common = require('../../../api/utils/common.js');
    var countlyDb = plugins.dbConnection();
    time = require('time')(Date);
    moment = require('moment');

    console.log("Checking if users have more than 10 sessions today");
    countlyDb.collection('apps').find({}).toArray(function (err, apps) {
    
        if (!apps || err) {
            return;
        }
        function checkUserHaveMore10Sessions(app, done){
            var cnt = 0;
           
            function cb(){
                done();
            }
            var startDay=Math.round(moment().startOf('day').unix());
            var now = Math.round(new Date().getTime()/1000);
            console.log('start:'+startDay);
            console.log('end:'+now);
            countlyDb.collection('app_event' + app._id).aggregate([
                {
                    $match:{
                        "t": "session",
                        "i.begin_session": "1",
                        'ts':{$gt:startDay,$lt:now}
                        }
                },
                {
                    $group: {
                        '_id': "$d.id",
                        'total': {
                            $sum: 1
                        }
                    }

                },
                {
                    $match:{
                        'total':{$gt:7}
                    }
                }
            ],function(err,users){

                if(err) console.log(err);
               
                if(users.length>0) {
                    var notification = {};
                    notification.event = {};
                    notification.event.users_have_10_sessions_today = true;
                    var params = {};
                    params.app_id = app._id;
                    listener.receive({params:params,notification:notification,users:users});
                }


                cb();

            });
        }
        async.forEach(apps, checkUserHaveMore10Sessions, function(){
            countlyDb.close();
            process.exit();
        });
    });




}

/**
 * Created by tuantx on 13/05/2016.
 */
var common = require('../../../api/utils/common.js');
var log = common.log('notifier:api');
var mail = require("../../../api/parts/mgmt/mail");
var listener = {};

(function (listener) {
    listener.receive =function (ob) {
        var notification=ob.notification;
        var params=ob.params;


        //notified to listener when total session count reached 100
        if(notification.event.total_session_count_reached)
        {
            var title="Total session count reached 100 today";
            var content="Total session count reached 100";

            sendNotification(title,content,params);
        }

        //Notified to listener when session with user property "Platform"="Android"
        if(notification.event.session_with_user_property)
        {

            title="session with user property Platform=Ios";
            content="session with user property Platform=Ios";
            sendNotification(title,content,params);

        }

        if(notification.event.custem_event_segmentation)
        {
            var title="Play custom event sum with segmentation Character = John reached 10 for today";
            var content="Play custom event sum with segmentation Character = John reached 10 for today";

            sendNotification(title,content,params);

        }

        if(notification.event.users_have_10_sessions_today)
        {
            var users= ob.users;
            var title="users have more than 10 session today";
            var content= JSON.stringify(users);

            sendNotification(title,content,params);
        }
        
        if(notification.event.users_dont_have_sessions_7days)
        {
            var users= ob.users;
            var title="users don't have any session in 7 days";
            var content= JSON.stringify(users);

            sendNotification(title,content,params);
        }

    };

    function sendNotification(title,content,params)
    {
        log.d(title);
        console.log(title);

        common.db.collection("members").findOne({'global_admin':true},function(err,member)
        {
            if (member && !err) {
                for(var i in member)

                    mail.sendMessage(member.email, title, content, function () {

                    });
            } else
            {
                log.d("no global admin");
            }
        });

        //send email to admins of

        var app_id=params.app_id+"";

        common.db.collection("members").findOne({'admin_of':{$in:[app_id]}},function(err,member)
        {


            if (member && !err) {

                mail.sendMessage(member.email, title, content, function () {
                });
            }
            else
            {

                log.d("no admin of");
                log.d(err);
            }
        });
    }


}(listener));

module.exports = listener;
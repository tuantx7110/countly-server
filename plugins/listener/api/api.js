var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');
log = common.log('listener:api');
mail = require("../../../api/parts/mgmt/mail");

(function (plugin) {
	//write api call
    function sendNotification(title,content,params)
    {
        log.d(title);
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
            log.d("app_id"+app_id);

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
	plugins.register("/listener", function(ob){
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

            title="session with user property Platform=Android";
            content="session with user property Platform=Android";
            sendNotification(title,content,params);

        }

        if(notification.event.custem_event_segmentation)
        {
            var title="Play custom event sum with segmentation Character = John reached 10 for today";
            var content="Play custom event sum with segmentation Character = John reached 10 for today";

            sendNotification(title,content,params);

        }





	});

}(plugin));

module.exports = plugin;
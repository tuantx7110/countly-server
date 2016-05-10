var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');
log = common.log('listener:api');

(function (plugin) {
	//write api call

	plugins.register("/listener", function(ob){
		var notification=ob.notification;
		if(notification.event.total_session_count_reached)
        {
            log.d("Total session count reached 100");
        }
	});

}(plugin));

module.exports = plugin;
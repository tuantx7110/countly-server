var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');
log = common.log('listener:api');

(function (plugin) {
	//write api call

	plugins.register("/listener", function(ob){
		log.d("receve the notification")
	});

}(plugin));

module.exports = plugin;
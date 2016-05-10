var async = require('async'),
    pluginManager = require('../pluginManager.js'),
    countlyDb = pluginManager.dbConnection();

console.log("Installing notifier plugin");
countlyDb.collection('apps').find({}).toArray(function (err, apps) {

    if (!apps || err) {
        return;
    }
    function upgrade(app, done){
        var cnt = 0;
        console.log("Creating app_event collection for " + app.name);
        function cb(){
            done();
        }
        countlyDb.createCollection('app_event' + app._id, {capped: true, size: 10000000, max: 1000}, cb);
    }
    async.forEach(apps, upgrade, function(){
        console.log("Notifer plugin installation finished");
        countlyDb.close();
    });
});
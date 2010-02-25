var Storage = Class.create({
	storage : null,
	//can we be sure that the timer was handled during the session of the card? Otherwise it needs to be set in the apps clear method explicitily
	timerHandled : false,
	buffer : {"active": null, "period": null, "lastSync": null},
	initialize : function(onSuccess) {
		this.storage = new Mojo.Depot({name : "clock-sync"});
		var synchronizer = new Mojo.Function.Synchronize({syncCallback: onSuccess});
		for (var prop in this.buffer) {
			this.storage.get(prop, synchronizer.wrap(this.readToBuffer.bind(this, prop)));
		}
	},
	readToBuffer: function(key, value) {
		Mojo.Log.info("storage read:", key, value);
		this.buffer[key] = value;
	},
	update: function(key, value) {
		Mojo.Log.info("storage write:", key, value);
		this.buffer[key]  = value;
		this.storage.add(key, value, null, function(err) {Mojo.Log.error("error in write", err);});
	},
	isActive : function() {
		return this.buffer.active?true:false;
	},
	setActive : function(value) {
		this.update("active", value);
	},
	getPeriod: function() {
		return this.buffer.period?this.buffer.period:"24:00:00";
	},
	setPeriod: function(value) {
		this.update("period", value);
	},
	getLastSync: function(){
		return this.buffer.lastSync;
	},
	setLastSync: function(value) {
		this.update("lastSync", value);
	},
	setTimerHandledInSession: function() {
		this.timerHandled = true;
	},
	getTimerHandledInSession: function() {
		return this.timerHandled;
	}
});

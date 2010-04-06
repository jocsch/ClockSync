var Storage = Class.create({
	storage : null,
	//can we be sure that the timer was handled during the session of the card? Otherwise it needs to be set in the apps clear method explicitily
	timerHandled : false,
	buffer : {"active": null, "period": null, "history":null, "totalDrift": null, "monitor": null, "fixedTimes": null},
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
	setTimerHandledInSession: function() {
		this.timerHandled = true;
	},
	getTimerHandledInSession: function() {
		return this.timerHandled;
	},
	addToHistory: function(entry) {
		var hist = this.getHistory();
		if (hist.unshift(entry) > 50) {
			hist.pop();
		}
		this.update("history", hist);
	},
	getHistory: function() {
		return this.buffer.history?this.buffer.history:[];
	/*	return   [
		{ "day": "Friday, 1th March", "localTime" : "15:00:12", "remoteTime": "15:01:12", "drift": "1 min" },
        { "day": "Friday, 1th March", "localTime" : "9:00:00", "remoteTime": "8:58:02", "drift": "1min 58s" },
        { "day": "Thursday, 28th February", "localTime" : "24:00:00", "remoteTime": "23:00:00", "drift": "60 min" }];*/
	},
	getFixedTimes: function() {
		return this.buffer.fixedTimes?this.buffer.fixedTimes.clone():[]; 
	},
	setFixedTimes: function(times) {
		this.update("fixedTimes", times);
	},
	removeFromFixedTimes: function(idx) {
		Mojo.Log.info("------------remove index", idx);
		if (idx > -1 && idx < this.getFixedTimes().length) {
			var vals = this.getFixedTimes();
			vals.splice(idx, 1);
			this.update("fixedTimes", vals);
		}
	},
	addToTotalDrift: function(sec) {
		this.update("totalDrift", this.getTotalDrift()+sec);
	},
	getTotalDrift: function() {
		return this.buffer.totalDrift?this.buffer.totalDrift:0;
	},
	isMonitor: function() {
		return this.buffer.monitor?this.buffer.monitor:false;
	},
	setMonitor: function(value) {
		this.update("monitor", value);
	}
});

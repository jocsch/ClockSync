var Backend = Class.create({
	storage : null,
	initialize: function(storage) {
		this.storage = storage;
	},
	
	getRemoteTime: function(onComplete, onFailure) {
		var parseDate = function(response) {
			var eTime = response.getHeader("Date")
			var msec = Date.parse(eTime);
			if (isNaN(msec)) {
				Mojo.Log.error("Can not parse date header:", eTime);
				onFailure("Can not parse date header");
				return;
			}
			onComplete(msec);
		}
		var myAjax = new Ajax.Request("", {
			method: "get",
			requestHeaders: {
			"USER_AGENT": navigator.userAgent
		},
		onSuccess: parseDate,
		onFailure: onFailure
		});
	},
	getRemoteTimeWithDrift: function(onComplete, onFailure) {
		var getSysTimeWrapper = function(msec) {
			var comp = onComplete;
			this.getSystemTime(function(localDate){
				var drift = Math.abs(localDate.utc - msec/1000);
				Mojo.Log.info("Drift: ", drift, localDate.utc, msec);
				comp(msec, drift, localDate.utc);
			});
		};
		this.getRemoteTime(getSysTimeWrapper.bind(this), onFailure);
	},
	getSystemTime: function(callback) {
		return new Mojo.Service.Request("palm://com.palm.systemservice/time", {
			method: "getSystemTime",
			onSuccess: callback,
			onFailure: callback
		});
	},
	
	setSystemTime: function(value, callback) {
		return new Mojo.Service.Request("palm://com.palm.systemservice/time", {
			method: "setSystemTime",
			parameters: value,
			onSuccess: callback,
			onFailure: callback
		});
	},
	
	setPreference : function(key, value) {
		return new Mojo.Service.Request("palm://com.palm.systemservice", {
			method: "setPreferences",
			parameters: {key:value}
		});
	},
	useRemoteTime: function(success, failure, force) {
		this.getRemoteTimeWithDrift(function(date, drift, local) {
			var obj = new Object();
			obj.utc = date/1000;
			//this.setPreference("receiveNetworkTimeUpdate", false);
			if (this.storage.isMonitor() && !force) {
				Mojo.Log.info("!! Simulation only");
				this.onUseRemoteTimeSuccess(date, drift, local, success, force?false:true);
			} else {
				Mojo.Log.info("!! Set clock for real");
				this.setSystemTime(obj, this.onUseRemoteTimeSuccess.bind(this, date, drift, local, success, false));
			}
		}.bind(this), 
		function(error) {
			this.getSystemTime(
				function(obj) {
					this.addEventToHistory(obj.utc*1000, null, null);
					failure(error);
				}.bind(this)
			);
		}.bind(this) );
	},
	onUseRemoteTimeSuccess: function(date, drift, local, success, skipTotalDrift) {
		if (!skipTotalDrift) {
			this.storage.addToTotalDrift(drift);
		}
		this.addEventToHistory(local*1000, date, drift);
		//we assume there is no lag in retrieving the date, so there is no initial drift after having set the localtime to remote time
		success(date, 0);
	},
	addEventToHistory: function(localTime, remoteTime, drift) {
		this.storage.addToHistory({
			localTime: localTime,
			remoteTime: remoteTime,
			drift: drift
		});
		//{ "day": "Friday, 1th March", "localTime" : "15:00:12", "remoteTime": "15:01:12", "drift":
	},
	handlePeriodicSync: function() {
		if (this.storage.isActive()) {
			this.startTimer(this.storage.getPeriod());
		} else  {
			this.stopTimer();
		}
		this.storage.setTimerHandledInSession();
	},
	stopTimer: function(onsuccess) {
		Mojo.Log.info("timer stop", onsuccess);
		var callback = onsuccess || function() {};
		var stopTimer = new Mojo.Service.Request('palm://com.palm.power/timeout', {
	 		method: "clear",
	 		parameters: {
	 			"key" : Mojo.appName + ".sync"
 			},
			onSuccess: callback,
			onFailure: callback
		});
	},
	startTimer: function(period) {
		Mojo.Log.error("timer start ", period);
		var timeout = new Mojo.Service.Request("palm://com.palm.power/timeout", {
			method: "set",
			parameters: {
				"key" : Mojo.appName + ".sync",
				"in": period,
				"wakeup": true,
				"uri": "palm://com.palm.applicationManager/launch",
				"params": {
					"id": Mojo.appName,
					"params": {"action": "sync"}
				}
			}
		});
	},
    formatDriftSec: function(secs) {
    	var day = Math.floor(secs/(60*60*24));
    	var rsecs = secs%(60*60*24);
    	var hr = Math.floor(rsecs/(60*60));
    	rsecs = rsecs%(60*60);
    	var min = Math.floor(rsecs/60);
    	var sec = rsecs%60;
    	if (day > 0) {
    		return [day, "days", hr, "hr", min, "min", sec, "sec"].join(" ");
    	}
    	if (hr > 0) {
    		return [hr, "hr", min, "min", sec, "sec"].join(" ");
    	}
    	if (min > 0) {
    		return [min, "min", sec, "sec"].join(" ");
    	}
    	return sec + " sec";
	} 
});

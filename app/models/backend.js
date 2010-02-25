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
	useRemoteTime: function(success, failure) {
		this.getRemoteTime(function(date) {
			var obj = new Object();
			obj.utc = date/1000;
			this.setPreference("receiveNetworkTimeUpdate", false);
			this.setSystemTime(obj, function(payload) {
				success(date);
			}.bind(this));
		}.bind(this), failure);
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
	}
});
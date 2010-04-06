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
			/*requestHeaders: {
				"USER_AGENT": navigator.userAgent
			},*/
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
		if (this.storage.isActive() || this.storage.getFixedTimes().length > 0) {
			this.startTimer(this.storage.isActive()?this.storage.getPeriod():null, this.storage.getFixedTimes());
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
	startTimer: function(period, fixedTimes) {
		Mojo.Log.info("timer start ", period, fixedTimes);
		var nextTime = this.getNextAbsoluteTime(new Date(), period, fixedTimes);
		var formatted = this.formatTimerDateString(nextTime);
		Mojo.Log.info("next timestamp", nextTime, "formatted: ", formatted);
		var timeout = new Mojo.Service.Request("palm://com.palm.power/timeout", {
			method: "set",
			parameters: {
				"key" : Mojo.appName + ".sync",
				"at": formatted,
				"wakeup": true,
				"uri": "palm://com.palm.applicationManager/launch",
				"params": {
					"id": Mojo.appName,
					"params": {"action": "sync"}
				}
			},
			onSuccess: function(suc) {Mojo.Log.info("Success", suc);},
			onFailure: function(err) {Mojo.Log.error("Error", err);}
		});
	},
	formatTimerDateString: function(date) {
		var zerofy = function(val) {
			var ret = val+"";
			if (ret.length == 1) {
				return "0"+ret;
			}
			return ret;
		};
		return          zerofy(date.getUTCMonth()+1)
				  + "/"+zerofy(date.getUTCDate())
				  + "/"+date.getUTCFullYear()
				  + " "+zerofy(date.getUTCHours())
				  + ":"+zerofy(date.getUTCMinutes())
				  + ":"+zerofy(date.getUTCSeconds());
	},
	getNextAbsoluteTime: function(curDate, period, fixedTimes) {
		var mixedTimes = fixedTimes.clone();
		//reset the seconds
		curDate.setSeconds(0);
		//period is stored in 00:05:00 format. We need to calculate the next fixed date and retrieve 
		//the minutes and hours from it to push them to the array for sorting
		if (period) {
			var comps = period.split(":");
			var ms = comps[0]*60*60*1000 + comps[1]*60*1000 + comps[2]*1000;
			var periodDate = new Date(curDate.getTime() + ms);
			mixedTimes.push({time: {hour: periodDate.getHours(), min: periodDate.getMinutes()}});
		}
		var curDateObj = {time: {hour: curDate.getHours(), min: curDate.getMinutes()}};
		curDateObj.equals = function(obj) {
			return this.time.hour == obj.time.hour && 
				   this.time.min  == obj.time.min;
		};
		mixedTimes.push(curDateObj);
		this.sortFixedTimes(mixedTimes);
		var nextDate = null;
		//find the current time and get the following time as the one to choose.
		//if there is no following time, get the first one but increase the day.
		var idx = mixedTimes.indexOf(curDateObj);
		//if the entries following curDateObj have the same timestamp, skip them
		while (idx < mixedTimes.length-1 && curDateObj.equals(mixedTimes[idx+1])) {
			idx++;
		}
		
		if (idx == mixedTimes.length-1) {
			//set ahead a day as there is nothing left for today
			nextDate = new Date(curDate.getTime() + 24*60*60*1000);
			nextDate.setHours(mixedTimes[0].time.hour);
			nextDate.setMinutes(mixedTimes[0].time.min);
		} else {
			nextDate = new Date(curDate.getTime());
			nextDate.setHours(mixedTimes[idx + 1].time.hour);
			nextDate.setMinutes(mixedTimes[idx + 1].time.min);
		}
		return nextDate;
	},
	//earliest time is first, latest is last
	sortFixedTimes: function(times) {
		times.sort(function(a,b) {
			if (a.time.hour == b.time.hour) {
				return a.time.min - b.time.min;
			}
			return a.time.hour - b.time.hour;
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

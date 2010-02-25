AppAssistant = Class.create({
	storage : null,
	backend : null,
	setup: function() {
	},
	cleanup: function() {
		this.schedule();
		//this.storage = this.backend = null;
	},
	handleLaunch: function(launchParams) {
		//storage setup is asynchronous. Do that first.
		this.storage = new Storage(this.internalLaunch.bind(this, launchParams));
	},
	internalLaunch: function(launchParams) {
		this.backend = new Backend(this.storage);
		Mojo.Log.info("Starting...", launchParams);
		if (launchParams && launchParams.action === "sync") {
			Mojo.Log.info("Headless: ", launchParams.action);
			try {
				this.backend.useRemoteTime(function() {
					this.storage.setLastSync(new Date().getTime());
					Mojo.Log.error("Successfull sync");
					Mojo.Controller.getAppController().showBanner({messageText: "Clock sync was successfull", icon: "icon.png"}, {source: "notification"});
				}.bind(this));
			} catch(err) {
				Mojo.Log.error("Something unplanned has happened: ", err);
			} finally {
				this.schedule();
			}
			return;
		}
		
		var stageController = this.controller.getStageController("main");
		if (stageController) {
			stageController.activate();
		} else {
			var pushMainScene = function(pstageController) {
				pstageController.pushScene("main", this.backend, this.storage);
			}.bind(this);
			this.controller.createStageWithCallback({name:"main", lightweight:  true}, pushMainScene, "card");
		}
		
	},
	schedule: function() {
		if (!this.storage.getTimerHandledInSession()) {
			this.backend.handlePeriodicSync();
		}
	}
	
});
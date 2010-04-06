MainAssistant = Class.create({                                                                                            
	initialize : function(backend, storage) {
		this.backend = backend;
		this.storage = storage;
		Mojo.Log.info("init", backend, storage);
	},
    setup : function(vari) {                                                                                               
		this.buildMenu();
        this.buildChangeButton();
        this.buildActive();      
        this.buildTime();        
        this.buildMonitor();      
        this.buildFixedTimes();
        this.buildHistoryButton();
        this.replaceSyncTitles();
        //important for delayed execution of setup (delayed because of storage loading)
        //this.controller.instantiateChildWidgets(this.controller.sceneElement);    
        this.backend.getRemoteTimeWithDrift(this.updateRemoteTime.bind(this),
        		                   this.showDialogBox.bind(this, "Problem", "Can not fetch remote time. Do you have an internet connection right now?"));
        
    },                                                                                                                 
    cleanup : function() {
        this.controller.stopListening(this.controller.get('active'), Mojo.Event.propertyChange, 
                                                                  this.handleActive.bind(this));
        this.controller.stopListening(this.controller.get('monitor'), Mojo.Event.propertyChange, 
                                                                  this.handleActive.bind(this));
        this.controller.stopListening(this.controller.get('time'), Mojo.Event.propertyChange,   
                                                                  this.handleTime.bind(this));  
        this.controller.stopListening(this.controller.get('changeButton'), Mojo.Event.tap,      
                                                                  this.handleChangeButton.bind(this));
        
        this.controller.stopListening(this.controller.get('fixedTimes'), Mojo.Event.listAdd,      
        														   this.handleFixedTimeAdd.bind(this));
        
        this.controller.stopListening(this.controller.get('fixedTimes'), Mojo.Event.listDelete,      
        														   this.handleFixedTimeDel.bind(this));
        
        if (this.storage.isActive() || this.storage.getFixedTimes().length > 0) {
			Mojo.Controller.getAppController().showBanner({messageText: "Clock is " + (this.storage.isMonitor()?"monitored":"synced") + " in background", icon: "icon.png"}, {source: "notification"});
        }
        Mojo.Controller.getAppController().closeAllStages();
        window.close();                                     
    },                                                          
    replaceSyncTitles: function() {
		/*var text = "Periodic " + (this.storage.isMonitor()?"Monitor":"Sync");
		this.controller.get("group-header-sync").innerHTML = text;
		this.controller.get("row-header-sync").innerHTML = text;*/
    },
    updateRemoteTime : function(date, drift) {
        this.controller.get("remote-time").innerHTML = Mojo.Format.formatDate(new Date(date), {date: "medium", time: "medium"}) + 
                                                       "<div id='temp-drift'>Your device is off by:  " + this.backend.formatDriftSec(drift) + "</div>";
        this.buttonModel.disabled = false;
    	this.controller.modelChanged(this.buttonModel);
	},
	buildMenu : function() {
		/*this.appMenuModel = {
				   items: [
				     {label: "Preferences", command: 'do-preferences'}
				   ]
				 };
				 
		 this.controller.setupWidget(Mojo.Menu.appMenu, {}, this.appMenuModel); */
	},
    buildActive : function() {
        // setup the active toggle
        var toggleAttributes = {};
        var toggleModel = {       
                value : this.storage.isActive(),   
                disabled : false                     
        };                                           

        this.controller.setupWidget("active", toggleAttributes, toggleModel);
        this.controller.listen(this.controller.get("active"), Mojo.Event.propertyChange, 
                                                   this.handleActive.bind(this));        
    },                                                                                       
    buildMonitor : function() {
        // setup the active toggle
        var toggleAttributes = {};
        var toggleModel = {       
                value : this.storage.isMonitor(),   
                disabled : false                     
        };                                           

        this.controller.setupWidget("monitor", toggleAttributes, toggleModel);
        this.controller.listen(this.controller.get("monitor"), Mojo.Event.propertyChange, 
                                                   this.handleMonitor.bind(this));        
    },                                                                                       
    buildFixedTimes: function() {
    	this.timeModel = { items: this.storage.getFixedTimes() }; 
    	var widget = this.controller.setupWidget("fixedTimes", {itemTemplate: "main/fixed-times-item-template",
    											addItemLabel: 'Add new time',
    											swipeToDelete: true,
    		                                    formatters: {
    		
    												//time : function(value) { return value?Mojo.Format.formatDate(new Date(value), {time: "medium"}):null} 
    												time : function(value) {
	    														if (!value) {
	    															return;
	    														}
	    														var date = new Date();
	    														date.setHours(value.hour);
	    														date.setMinutes(value.min);
	    														return ("Every day at " + Mojo.Format.formatDate(date, {time: "short"}));
												    		}
										    	}
    	} , this.timeModel);	
    	/* add event handlers to listen to events from widgets */
    	//this.controller.listen('fixedTimes',Mojo.Event.listTap, this.listTapped.bind(this));
    	this.controller.listen('fixedTimes',Mojo.Event.listAdd, this.handleFixedTimeAdd.bind(this));
    	this.controller.listen('fixedTimes',Mojo.Event.listDelete, this.handleFixedTimeDel.bind(this));
        window.setTimeout(this.checkFixedTimeAdd.bind(this));
    	//this.controller.listen('fixedTimes',Mojo.Event.listReorder, this.listReorder.bind(this));
    },
    buildTime : function() {
        // setup the switch timing options
        var timeOptions = [               
                //{ label : "Every 5 min", value : "00:05:00" },  
                { label : "Every 2 hours", value : "02:00:00" },  
                { label : "Every 6 hours", value : "06:00:00" },  
                { label : "Every 12 hours", value : "12:00:00" },  
                { label : "Daily", value : "24:00:00" },    
        ];                                                   

        var timeAttributes = {
                label : "Sync Interval",
                choices : timeOptions,  
                modelProperty : "currentTime",
                labelPlacement : Mojo.Widget.labelPlacementLeft
        };                                                     

        var timeModel = { currentTime : this.storage.getPeriod()};

        this.controller.setupWidget("time", timeAttributes, timeModel);
        this.controller.listen(this.controller.get("time"), Mojo.Event.propertyChange, 
                                                   this.handleTime.bind(this));        
    },                                                                                     
    buttonModel : {             
        buttonLabel : 'Sync Now',
        buttonClass : '',          
        disabled : true           
    },                                 
    buildChangeButton : function() {
        // setup the the switcher button
        var buttonAttributes = {};      
        this.controller.setupWidget("changeButton", buttonAttributes, this.buttonModel);
        this.controller.listen(this.controller.get('changeButton'),Mojo.Event.tap, 
                                                   this.handleChangeButton.bind(this));
    },                                                                                     
    buildHistoryButton : function() {
    	var cmdMenuModel = {
    			   visible: true,
    			   items: [ {label: 'History', icon:'xapp-calendar', command:'do-history'} ]
    			 };
    			 
		this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, cmdMenuModel);
    },
    handleActive : function(event) {
        Event.stop(event);
        this.storage.setActive(event.value);
        this.backend.handlePeriodicSync();
    },                        
    handleMonitor : function(event) {
        Event.stop(event);
        this.storage.setMonitor(event.value);
    },                        
    handleTime : function(event) {
        Event.stop(event);
        this.storage.setPeriod(event.value);
        this.backend.handlePeriodicSync();
    },                        
    handleChangeButton : function(event) {
        Event.stop(event);
        this.backend.useRemoteTime(this.updateRemoteTime.bind(this), function(){}, true);
            
    },
    handleFixedTimeAdd: function(event) {
    	var dialog = this.controller.showDialog({
    	 	template: 'main/fixed-times-dialog',
    	 	assistant: new FixedTimeDialogAssistant(this)
    	 });
    },
    handleFixedTimeDialog: function(date) {
    	var times = this.storage.getFixedTimes();
    	times.push({time: {hour: date.getHours(), min: date.getMinutes()}});
    	this.backend.sortFixedTimes(times);
    	this.storage.setFixedTimes(times);
    	this.timeModel.items = this.storage.getFixedTimes();
    	this.controller.modelChanged(this.timeModel);
    	this.checkFixedTimeAdd();
        this.backend.handlePeriodicSync();
    },
    checkFixedTimeAdd: function() {
    	this.controller.get("fixedTimes").mojo.showAddItem(this.storage.getFixedTimes().length < 5);
    },
    handleFixedTimeDel: function(event) {
    	this.storage.removeFromFixedTimes(event.index);
    	this.checkFixedTimeAdd();
        this.backend.handlePeriodicSync();
    },
    showDialogBox : function(title, message){
        this.controller.showAlertDialog({
                onChoose : function(value) {},
                title : title,
                message : message,
                choices : [ { label : "OK", value : "OK", type : "color" } ]
        });
    }
});

var FixedTimeDialogAssistant = Class.create({
 	initialize: function(sceneAssistant) {
 		this.sceneAssistant = sceneAssistant;
 		this.controller = sceneAssistant.controller;
 	},
 
 	setup : function(widget) {
 		this.widget = widget;
 		this.controller.setupWidget("okButton", {}, { buttonLabel: "Add time", disabled: false } );
 		this.controller.get("okButton").addEventListener(Mojo.Event.tap, this.handleOK.bind(this));
 		
 		this.controller.setupWidget("cancelButton", {}, { buttonLabel: "Cancel", disabled: false } );
 		this.controller.get("cancelButton").addEventListener(Mojo.Event.tap, this.handleCancel.bind(this));
 		
 		this.timeModel = {time : new Date()};
 		this.controller.setupWidget('picker', {modelProperty:'time',
 											   label: "Time",
								               labelPlacement : Mojo.Widget.labelPlacementLeft
					                }, this.timeModel);
 	},
 	handleOK: function() {
 		this.sceneAssistant.handleFixedTimeDialog(this.timeModel.time);
 		this.widget.mojo.close();
 	},
 	handleCancel: function() {
 		this.widget.mojo.close();
 	},
 	cleanup: function() {
        this.controller.stopListening(this.controller.get('okButton'), Mojo.Event.tap,      
        														   this.handleOK.bind(this));
        this.controller.stopListening(this.controller.get('cancelButton'), Mojo.Event.tap,      
        														   this.handleCancel.bind(this));
 	}
 
 
 });    
HistoryAssistant = Class.create({                                                                                            
	backend: null,
	storage: null,
	initialize: function(backend, storage) {
		this.backend = backend;
		this.storage = storage;
	},
    setup : function() {                                                                                               
		this.buildMenu();
		this.buildHistory();
		this.buildViewMenu();
		
		this.controller.get("overall-drift").innerHTML = this.backend.formatDriftSec(this.storage.getTotalDrift());
		
    },                                                                                                                 
    buildHistory : function() {
    	this.historyModel = { items: this.storage.getHistory() }; 
    	this.controller.setupWidget("history", {itemTemplate: "history/item-template",
    		                                    emptyTemplate: "history/empty-history",
    		                                    dividerTemplate: "history/divider-template",
    		                                    formatters: {
    												localTime : function(value) { return value?Mojo.Format.formatDate(new Date(value), {time: "medium"}):null} ,
    												remoteTime : function(value) { return value?Mojo.Format.formatDate(new Date(value), {time: "medium"}):"FAILED"},
    												drift : function(value) {return value !== null?(value + " sec"):"n.A."}
										    	},
    		                                    dividerFunction: function(model) {
		    		return Mojo.Format.formatDate(model.remoteTime!= null?new Date(model.remoteTime):new Date(model.localTime), {date: "medium"});
    	} }, this.historyModel);
    },
	buildMenu : function() {
		/*this.appMenuModel = {
				   items: [
				     {label: "Preferences", command: 'do-preferences'}
				   ]
				 };
				 
		 this.controller.setupWidget(Mojo.Menu.appMenu, {}, this.appMenuModel); */
	},
    buildViewMenu: function() {
		this.controller.setupWidget(Mojo.Menu.viewMenu,
				    { spacerHeight: 50, menuClass:'no-fade' },
				    {
				        visible: true,
				        items: [{label: "History", width: 320}]
				    });
    },
    cleanup : function() {
      /*  this.controller.stopListening(this.controller.get('active'), Mojo.Event.propertyChange, 
                                                                  this.handleActive.bind(this));
        this.controller.stopListening(this.controller.get('time'), Mojo.Event.propertyChange,   
                                                                  this.handleTime.bind(this));  
        this.controller.stopListening(this.controller.get('changeButton'), Mojo.Event.tap,      
                                                                  this.handleChangeButton.bind(this));
        if (this.storage.isActive()) {
			Mojo.Controller.getAppController().showBanner({messageText: "Clock syncs in background", icon: "icon.png"}, {source: "notification"});
        }
        Mojo.Controller.getAppController().closeAllStages();
        window.close();                                     */
    }
});
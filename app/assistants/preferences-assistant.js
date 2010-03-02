PreferencesAssistant = Class.create({                                                                                            
	backend: null,
	storage: null,
	initialize: function(backend, storage) {
		this.backend = backend;
		this.storage = storage;
	},
	setup: function() {
		this.buildViewMenu();
		this.buildMonitor();
	},
	buildViewMenu: function() {
		this.controller.setupWidget(Mojo.Menu.viewMenu,
				    { spacerHeight: 50, menuClass:'no-fade' },
				    {
				        visible: true,
				        items: [{label: "Preferences", width: 320}]
				    });
    },
	buildMonitor : function() {
	    var toggleAttributes = {};
	    var toggleModel = {       
	            value : this.storage.isMonitor(),   
	            disabled : false                     
	    };                                           
	
	    this.controller.setupWidget("monitor", toggleAttributes, toggleModel);
	    this.controller.listen(this.controller.get("monitor"), Mojo.Event.propertyChange, 
	                                               this.handleMonitor.bind(this));        
	},            
	handleMonitor: function(event) {
        Event.stop(event);
        this.storage.setMonitor(event.value);
	},
	cleanup: function() {
        this.controller.stopListening(this.controller.get('monitor'), Mojo.Event.propertyChange,  this.handleMonitor.bind(this));
	}
});
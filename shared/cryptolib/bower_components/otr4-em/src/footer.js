}).call(moduleScope);

    if (typeof exports !== 'undefined'){
	    module.exports = moduleScope.Module;
    }else{
        root.libotr4Module = moduleScope.Module;
    }

}).call();

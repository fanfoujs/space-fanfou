var SF = {
	checkAndExec: function(name, vars, func) {
		var data = [name];
		for (var i = 0; i < vars.length; ++i)
			data.push(name + '.' + vars[i]);
		chrome.extension.sendRequest(
			{ func: 'readData', data: data },
			function(data) {
				if (data.shift())
					func.apply(this, data);
			}
		);
	}
};

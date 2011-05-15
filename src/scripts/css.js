(function() {
	chrome.extension.sendRequest(
		{ func: 'getStyles' },
		function(data) {
            var $style = document.createElement('style');
            $style.appendChild(document.createTextNode(data));
            document.documentElement.appendChild($style);
		}
	);
})();

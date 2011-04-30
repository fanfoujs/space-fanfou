// 太空饭否脚本页

function addJQuery(callback) {
  var script = document.createElement("script");
  script.setAttribute("src", "http://code.jquery.com/jquery-1.4.4.min.js");
  script.addEventListener('load', function() {
    var script = document.createElement("script");
    script.textContent = "(" + callback.toString() + ")();";
    document.body.appendChild(script);
  }, false);
  
  document.body.appendChild(script);
};

function init() {

// Expanding repies

// Image uploading function

};

addJQuery(init);

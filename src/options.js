$(function() {
    function getValue($elem) {
        if ($elem.is(':checkbox'))
            return $elem.is(':checked');
        else
            return $elem.val();
    }

    function setValue($elem, value) {
        if ($elem.is(':checkbox'))
            $elem.attr('checked', value);
        else
            $elem.val(value);
    }

    $('[key]').change(function() {
        var $t = $(this);
        var $opts = $('[key^="' + $t.attr('key') + '."]').parents('p');
        if (getValue($t)) {
            $opts.show();
        } else {
            $opts.hide();
        }
    });

    // 获取选项信息
    $('[key]').each(function() {
        var $t = $(this);
        setValue($t, SF.st.settings[$t.attr('key')]);
        $t.change();
    });

    $('#btn_apply').click(function() {
        $('[key]').each(function() {
            var $t = $(this);
            var key = $t.attr('key');
            if (getValue($t) != SF.st.settings[key])
                SF.st.settings[key] = getValue($t);
        });
        localStorage['settings'] = JSON.stringify(SF.st.settings);
    });

    $(window).unload(function() {
        $('#btn_apply').click();
    });

    $.getJSON('manifest.json', function(data) {
        $('#version').text(data.version);
    });
});

this.screenshotPreview = function(){	
		xOffset = 10;
		yOffset = 30;
	$(".screenshot").hover(function(e){
		this.t = this.title;
		this.title = "";	
		var c = (this.t != "") ? "<br />" + this.t : "";
		$("body").append("<p id='screenshot'><img src='" + this.rel + "' alt='预览' />" + c + "</p>");								 
		$("#screenshot")
			.css("top", (e.pageY - xOffset) + "px")
			.css("left", (e.pageX + yOffset) + "px")
			.fadeIn("fast");						
    },
	function(){
		this.title = this.t;	
		$("#screenshot").remove();
    });	
	$(".screenshot").mousemove(function(e){
		$("#screenshot")
			.css("top", (e.pageY - xOffset) + "px")
			.css("left", (e.pageX + yOffset) + "px");
	});			
};

$(document).ready(function(){
	screenshotPreview();
});

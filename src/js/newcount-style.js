(function() {
    function onInterval() {
        $('#navigation .count, #navtabs .count').each(function() {
            var $this = $(this);
            if ($this.hasClass('newcount')) return;
            $this.addClass('newcount');
            var number = $this.text().slice(1, -1);
            var $newcount = $('<span>');
            $newcount.addClass('newcount');
            $newcount.text(number);
            $this.after($newcount);
            $this.css('opacity','0');
        });
    }
    var interval = setInterval(onInterval, 200);
    $(function() {
        clearInterval(interval);
        onInterval();
    });
})();
